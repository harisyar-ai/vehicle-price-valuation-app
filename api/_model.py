"""Model port for the Vercel serverless API.

Custom sklearn classes and prediction logic ported VERBATIM from the
pakistani-car-price-predictor Streamlit app (app.py). The pickled pipeline
references __main__.FeaturePrep / __main__.TargetMeanEncoder, so the classes
are injected into __main__ before joblib.load (same as the original app).
"""
import ctypes
import json
import os
import re

# LightGBM's native lib needs libgomp (OpenMP), which Vercel's Python runtime
# does not ship. We bundle a manylinux-compatible libgomp.so.1 with the
# function and preload it before anything imports lightgbm.
_gomp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "libgomp.so.1")
if os.path.exists(_gomp):
    ctypes.CDLL(_gomp, mode=ctypes.RTLD_GLOBAL)

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

NUMERIC_COLS       = ['car_age', 'Mileage', 'Engine_CC_Clean']
TARGET_ENCODE_COLS = ['brand', 'model_s4', 'brand_model_generation']
OHE_COLS           = ['generation', 'Fuel_Type', 'Transmission', 'brand_origin', 'city_tier',
                       'trim_tier_s4', 'trim_grade_s4']
BINARY_COLS        = ['is_electric']

class FeaturePrep(BaseEstimator, TransformerMixin):
    def __init__(self, rare_trim_threshold=30, rare_model_threshold=30,
                 rare_generation_threshold=30, rare_model_generation_threshold=30):
        self.rare_trim_threshold  = rare_trim_threshold
        self.rare_model_threshold = rare_model_threshold
        self.rare_generation_threshold = rare_generation_threshold
        self.rare_model_generation_threshold = rare_model_generation_threshold

    @staticmethod
    def _clean_trim(series):
        out = series.fillna('Unspecified').astype(str).str.strip()
        out = out.replace({'': 'Unspecified', 'nan': 'Unspecified', 'None': 'Unspecified'})
        out = out.replace({'Base Grade': 'Unspecified'})
        return out

    @staticmethod
    def _clean_generation(series):
        out = series.fillna('Unspecified').astype(str).str.strip()
        out = out.replace({'': 'Unspecified', 'nan': 'Unspecified', 'None': 'Unspecified'})
        return out

    def fit(self, X, y=None):
        X = X.copy()
        non_ev = X['is_electric'] != 1
        bm = X.loc[non_ev].groupby(['brand', 'model'])['Engine_CC_Clean'].median()
        b  = X.loc[non_ev].groupby('brand')['Engine_CC_Clean'].median()
        self.engine_bm_median_     = bm.to_dict()
        self.engine_b_median_      = b.to_dict()
        self.engine_global_median_ = float(X.loc[non_ev, 'Engine_CC_Clean'].median())

        trim        = self._clean_trim(X['trim_grade_s4'])
        trim_counts = trim.value_counts()
        self.common_trims_ = set(trim_counts[trim_counts >= self.rare_trim_threshold].index)

        generation = self._clean_generation(X['generation'])
        gen_counts = generation.value_counts()
        self.common_generations_ = set(gen_counts[gen_counts >= self.rare_generation_threshold].index)

        pair_counts        = X.groupby(['brand', 'model']).size()
        self.common_pairs_ = set(pair_counts[pair_counts >= self.rare_model_threshold].index)

        bmg = X['brand'].astype(str) + ' | ' + X['model'].astype(str) + ' | ' + generation
        bmg_counts = bmg.value_counts()
        self.common_brand_model_generations_ = set(
            bmg_counts[bmg_counts >= self.rare_model_generation_threshold].index
        )
        return self

    def transform(self, X):
        X = X.copy()
        def fill_engine(row):
            val = row['Engine_CC_Clean']
            if pd.notna(val) or row['is_electric'] == 1:
                return val
            key = (row['brand'], row['model'])
            if key in self.engine_bm_median_ and pd.notna(self.engine_bm_median_[key]):
                return self.engine_bm_median_[key]
            if row['brand'] in self.engine_b_median_ and pd.notna(self.engine_b_median_[row['brand']]):
                return self.engine_b_median_[row['brand']]
            return self.engine_global_median_

        X['Engine_CC_Clean'] = X.apply(fill_engine, axis=1)

        X['trim_grade_s4']   = self._clean_trim(X['trim_grade_s4'])
        X.loc[~X['trim_grade_s4'].isin(self.common_trims_), 'trim_grade_s4'] = 'Other_Trim'
        X['trim_tier_s4']    = X['trim_tier_s4'].fillna('Unspecified').astype(str).str.strip()
        X['trim_tier_s4']    = X['trim_tier_s4'].replace({'': 'Unspecified', 'nan': 'Unspecified', 'None': 'Unspecified'})

        X['generation'] = self._clean_generation(X['generation'])
        X.loc[~X['generation'].isin(self.common_generations_), 'generation'] = 'Other_Generation'

        X['model_s4']        = X['model']
        pair_index  = pd.MultiIndex.from_frame(X[['brand', 'model']])
        common_mask = pair_index.isin(self.common_pairs_)
        X.loc[~common_mask, 'model_s4'] = 'Other'

        X['brand_model_generation'] = X['brand'].astype(str) + ' | ' + X['model'].astype(str) + ' | ' + X['generation']
        X.loc[~X['brand_model_generation'].isin(self.common_brand_model_generations_), 'brand_model_generation'] = 'Other_Brand_Model_Generation'

        return X[NUMERIC_COLS + TARGET_ENCODE_COLS + OHE_COLS + BINARY_COLS]

class TargetMeanEncoder(BaseEstimator, TransformerMixin):
    def __init__(self, cols, smoothing=10):
        self.cols      = cols
        self.smoothing = smoothing

    def fit(self, X, y):
        X = X.copy()
        y = pd.Series(y, index=X.index, name='target')
        self.global_mean_ = float(y.mean())
        self.maps_ = {}
        for col in self.cols:
            stats  = y.groupby(X[col]).agg(['mean', 'count'])
            smooth = (stats['count'] * stats['mean'] + self.smoothing * self.global_mean_) / (stats['count'] + self.smoothing)
            self.maps_[col] = smooth.to_dict()
        return self

    def transform(self, X):
        X = X.copy()
        for col in self.cols:
            X[col] = X[col].map(self.maps_[col]).fillna(self.global_mean_).astype(float)
        return X

JAPANESE  = {'Toyota','Honda','Suzuki','Daihatsu','Nissan','Mitsubishi','Mazda','Subaru','Isuzu','Lexus'}
KOREAN    = {'Hyundai','Kia','SsangYong','Daewoo'}
CHINESE   = {'Changan','Haval','MG','FAW','BAIC','Chery','DFSK','Proton','Jetour','BYD','Deepal','Seres',
             'ORA','Jaecoo','Dongfeng','Forthing','GAC','JMEV','ZOTYE','Daehan','Rinco','Honri'}
EUROPEAN  = {'Mercedes Benz','BMW','Audi','Porsche','Volkswagen','Peugeot','Skoda','Volvo','Bentley',
             'Bugatti','Fiat','Chrysler','Jaguar','Land Rover','Range Rover','MINI'}
AMERICAN  = {'Ford','Chevrolet','Jeep','Dodge','Tesla','GMC','Hummer','Cadillac','Buick'}
PAKISTANI = {'Prince','United','Sogo','Adam','Power','Master','GUGO','Inverex'}
MALAYSIAN = {'Perodua','Proton'}

def get_brand_origin(brand):
    if brand in JAPANESE:  return 'Japanese'
    if brand in KOREAN:    return 'Korean'
    if brand in CHINESE:   return 'Chinese'
    if brand in EUROPEAN:  return 'European'
    if brand in AMERICAN:  return 'American'
    if brand in PAKISTANI: return 'Pakistani'
    if brand in MALAYSIAN: return 'Malaysian'
    return 'Other'

def get_city_tier(city):
    if city in ('Karachi','Lahore','Islamabad'):
        return 'Tier_1'
    if city in ('Rawalpindi','Faisalabad','Peshawar','Multan','Gujranwala','Sialkot','Hyderabad','Quetta'):
        return 'Tier_2'
    return 'Tier_3'

PERFORMANCE_TERMS = ['RS Turbo','RS','AMG','C63','G63','C63 AMG','E63 AMG','SVR','Evo','Evolution','GR Sport','M Series']
PREMIUM_TERMS     = ['Grande','Altis Grande','Altis X','Altis','Oriel','Aspire','VXL','GLS','Prosmatec',
                     'Limited','Signature','FutureSense','High Grade']
MID_TERMS         = ['VXR','GLi','VTi','EXi','DLX','AWD','FWD','HEV','Hybrid']
BASE_TERMS        = ['VX','XLi','XE','Standard','Base','GL','G','X','F','S','L']

def get_trim_tier(trim_grade):
    if not trim_grade or trim_grade in ('Unspecified', ''):
        return 'Unspecified'
    for t in PERFORMANCE_TERMS:
        if t.lower() in trim_grade.lower():
            return 'performance'
    for t in PREMIUM_TERMS:
        if t.lower() in trim_grade.lower():
            return 'premium'
    for t in MID_TERMS:
        if t.lower() in trim_grade.lower():
            return 'mid'
    for t in BASE_TERMS:
        if t.lower() in trim_grade.lower():
            return 'base'
    return 'Unspecified'

def get_price_margin(price_lacs):
    if price_lacs <= 20:   return 0.102
    if price_lacs <= 50:   return 0.055
    if price_lacs <= 100:  return 0.037
    return 0.0475

def get_confidence(brand, price_lacs):
    high_conf_brands = {'Toyota','Honda','Suzuki','Kia','Hyundai'}
    if brand in high_conf_brands and price_lacs <= 100:
        return "high", "High Confidence", "conf-high"
    mainstream = JAPANESE | KOREAN
    if brand in mainstream and price_lacs <= 200:
        return "good", "Good Estimate", "conf-good"
    return "mod", "Moderate Estimate", "conf-mod"

def format_urdu_price(price_lacs):
    return f"{price_lacs:.1f} لاکھ روپے"



_API_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL = None

def get_model():
    """Lazy singleton: model loads on first prediction (cold start)."""
    global _MODEL
    if _MODEL is None:
        import __main__
        # The pickle was saved with classes defined in __main__; make them
        # resolvable under the exact same names before unpickling.
        __main__.FeaturePrep = FeaturePrep
        __main__.TargetMeanEncoder = TargetMeanEncoder
        _MODEL = joblib.load(os.path.join(_API_DIR, "lgbm.pkl"))
    return _MODEL


def predict_price_lacs(brand, model_name, generation, trim, engine_cc,
                       fuel_type, transmission, year, mileage, city):
    """Reproduces app.py predict_price exactly. Returns price in PKR lacs."""
    global model
    model = get_model()
    car_age      = 2026 - year
    city_tier    = get_city_tier(city)
    brand_origin = get_brand_origin(brand)
    is_electric  = 1 if fuel_type in ('Electric', 'REEV') else 0
    trim_tier    = get_trim_tier(trim)
    trim_grade   = trim if trim and trim != 'Unspecified' else 'Unspecified'

    row = pd.DataFrame([{
        'car_age':        car_age,
        'Mileage':        mileage,
        'Engine_CC_Clean': float(engine_cc) if engine_cc else np.nan,
        'brand':          brand,
        'model':          model_name,
        'generation':     generation,
        'Fuel_Type':      fuel_type,
        'Transmission':   transmission,
        'brand_origin':   brand_origin,
        'city_tier':      city_tier,
        'trim_tier_s4':   trim_tier,
        'trim_grade_s4':  trim_grade,
        'is_electric':    is_electric,
    }])

    log_pred  = model.predict(row)[0]
    price_lac = np.expm1(log_pred)
    return float(price_lac)

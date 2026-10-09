# MotorVal — Vehicle Price Valuation App

A premium used-car valuation instrument for the Pakistani market, powered by a
LightGBM model trained on PakWheels listings (original research: Muhammad Haris
Afridi — `pakistani-car-price-predictor`).

- **Frontend:** React + Vite + Tailwind. Cascading vehicle selector
  (make → model → generation) driven by `public/dropdown_data.json`,
  spec form scoped to the selected vehicle, animated price reveal.
- **API:** `api/predict.py` — Vercel Python serverless function. Loads
  `api/lgbm.pkl` (LightGBM pipeline) via `api/_model.py`, which ports the
  custom sklearn transformers (`FeaturePrep`, `TargetMeanEncoder`) and the
  exact `predict_price` feature pipeline verbatim from the original
  Streamlit app. Predictions are bit-identical to the original app.

## Project layout

```
├── src/                    # React frontend
│   ├── components/         # VehicleStep, SpecStep, Readout, fields
│   └── lib/                # api.js, format.js (lakh/crore PKR formatting)
├── public/dropdown_data.json  # 77 makes, fetched at runtime
├── api/
│   ├── predict.py          # POST /api/predict  (Vercel serverless)
│   ├── _model.py           # verbatim model port (not an endpoint: "_" prefix)
│   └── lgbm.pkl            # 2.9 MB LightGBM pipeline
├── requirements.txt        # lean: sklearn 1.6.1, lightgbm 4.6.0, pandas, numpy, joblib
└── vercel.json             # vite build → dist
```

## API contract

`POST /api/predict`
```json
{
  "brand": "Toyota", "model": "Corolla", "generation": "11th Generation",
  "trim": "GLi", "engine_cc": 1300, "fuel_type": "Petrol",
  "transmission": "Manual", "year": 2020, "mileage": 80000, "city": "Lahore"
}
```
→
```json
{
  "price_lacs": 33.23, "price_pkr": 3323120,
  "low_lacs": 31.4, "high_lacs": 35.06,
  "price_display": "PKR 33.2 Lacs",
  "urdu": "33.2 لاکھ روپے",
  "confidence": "high", "confidence_label": "High Confidence"
}
```

## Local development

```bash
npm install
npm run dev        # frontend on :5173 (API calls hit /api/predict — set VITE_API_URL to a local python server)
npm run build
```

## Deploy

Push to GitHub, import in Vercel. Auto-detected: Vite frontend (`npm run build`
→ `dist`), Python functions in `api/`. No env vars required.

> Note: cold starts on Hobby (10s limit) pay the pandas/sklearn/lightgbm
> import cost once per warm instance; single-row inference itself is
> milliseconds.

## Scope notes

- Prediction only. The original app's PakWheels "similar listings" scraper
  was deliberately not ported.
- The `master` price logic (log-target → `expm1` → PKR lacs), margin bands,
  confidence tiers and Urdu formatting are reproduced exactly from the
  original app.

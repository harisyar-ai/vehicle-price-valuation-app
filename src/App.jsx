import React from 'react'
import Shell from './components/Shell.jsx'
import PredictPage from './pages/PredictPage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DocsPage from './pages/DocsPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

/** Root: shell router. Predict is the default page. */
export default function App() {
  const [page, setPage] = React.useState('predict')
  const [data, setData] = React.useState(null)
  const [dataError, setDataError] = React.useState(null)

  React.useEffect(() => {
    fetch('/dropdown_data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch(() => setDataError('Could not load the vehicle catalogue. Reload the page to try again.'))
  }, [])

  React.useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page ])

  return (
    <Shell page={page} onNav={setPage}>
      {page === 'predict' && <PredictPage data={data} dataError={dataError} />}
      {page === 'search' && <SearchPage data={data} dataError={dataError} />}
      {page === 'docs' && <DocsPage />}
      {page === 'about' && <AboutPage />}
    </Shell>
  )
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import CinemaApp from './CinemaApp.jsx'
import '../../index.css'

const root = /** @type {HTMLElement} */ (document.getElementById('root'))
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <CinemaApp />
  </React.StrictMode>
)

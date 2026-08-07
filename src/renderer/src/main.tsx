import './assets/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

window.addEventListener('error', (e) => {
  document.body.innerHTML += '<div style="color:red;z-index:9999;position:absolute;top:0;left:0;background:black;padding:20px;width:100%;height:100%;overflow:auto;"><pre>' + (e.error ? e.error.stack : e.message) + '</pre></div>';
});
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML += '<div style="color:red;z-index:9999;position:absolute;top:0;left:0;background:black;padding:20px;width:100%;height:100%;overflow:auto;"><pre>Unhandled Rejection: ' + (e.reason ? (e.reason.stack || e.reason.message || e.reason) : 'Unknown') + '</pre></div>';
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

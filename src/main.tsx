import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import NG from './NetworkGraph.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NG />
  </StrictMode>
)

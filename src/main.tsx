import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { store } from './store/store';
import { Provider } from 'react-redux';
import { installDatePickerOnClick } from './utils/datePickerOnClick';

installDatePickerOnClick();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
    <App />
    </Provider>
  </StrictMode>,
)

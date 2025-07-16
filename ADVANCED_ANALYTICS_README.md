# Advanced Analytics Component

## 🎯 Overview

Il componente `AdvancedAnalytics` è stato completamente ridisegnato con un CSS dedicato per fornire una dashboard moderna e professionale per l'analisi business del sistema loyalty.

## 🎨 Design System

### Variabili CSS
```css
:root {
  --analytics-primary: #3B82F6;
  --analytics-secondary: #8B5CF6;
  --analytics-success: #10B981;
  --analytics-warning: #F59E0B;
  --analytics-danger: #EF4444;
  --analytics-info: #06B6D4;
}
```

### Componenti Principali

#### 1. **Header Controls**
- Selettori per periodo di analisi (settimanale, mensile, trimestrale, annuale)
- Date range picker per analisi personalizzate
- Pulsanti per export e refresh dati

#### 2. **KPI Cards**
- 4 card responsive con metriche chiave:
  - Revenue Totale con trend vs periodo precedente
  - Numero Transazioni con AOV
  - GEMME Distribuite
  - Clienti Attivi con retention rate

#### 3. **Charts Grid**
- Grafico LineChart per trend revenue/transazioni
- Grafico PieChart per distribuzione GEMME

#### 4. **Top Customers**
- Classifica top 10 clienti per valore
- Badge speciali per podio (oro, argento, bronzo)
- Statistiche dettagliate per ogni cliente

#### 5. **Detailed Table**
- Tabella completa con tutti i dati aggregati per periodo
- Responsive table con scroll orizzontale su mobile

## 🎭 Features

### Responsive Design
- Layout mobile-first
- Grid system flessibile
- Componenti che si adattano ai diversi breakpoint

### Animazioni
- Fade-in per il container principale
- Slide-up per le KPI cards
- Hover effects su tutti gli elementi interattivi

### Dark Mode Support
- Supporto automatico per il dark mode
- Variabili CSS dinamiche per temi

### Performance
- Componente memo-izzato per evitare re-render inutili
- CSS separato per bundle splitting ottimale
- Lazy loading delle icone Lucide

## 🔧 Usage

```jsx
import AdvancedAnalytics from './components/Analytics/AdvancedAnalytics'

<AdvancedAnalytics showNotification={showNotification} />
```

## 📱 Mobile Optimizations

- Controlli impilati verticalmente su mobile
- KPI cards a colonna singola
- Charts grid responsive
- Customer list ottimizzata per touch
- Tabella con scroll orizzontale

## 🎨 CSS Architecture

### File Structure
```
src/components/Analytics/
├── AdvancedAnalytics.jsx
└── AdvancedAnalytics.css
```

### Class Naming Convention
- Prefisso `analytics-` per evitare conflitti
- Nomenclatura BEM-style per componenti complessi
- Utility classes per spacing e layout

### Key Classes
- `.analytics-dashboard` - Container principale
- `.analytics-kpi-grid` - Grid delle KPI cards
- `.analytics-chart-container` - Container per grafici
- `.analytics-customer-row` - Riga cliente nella classifica
- `.analytics-table` - Tabella responsive

## 🚀 Performance Benefits

1. **CSS Separato**: Bundle più piccolo e cache ottimale
2. **Variabili CSS**: Temi dinamici senza JS
3. **Grid Layout**: Performance migliore vs Flexbox per layout complessi
4. **Minimal JS**: Logica di styling principalmente in CSS

## 🎯 Future Enhancements

- [ ] Grafici interattivi con drill-down
- [ ] Export in formato PDF
- [ ] Filtri avanzati per segmentazione clienti
- [ ] Dashboard personalizzabili
- [ ] Real-time updates con WebSocket

---

**Sviluppato con ❤️ per Sapori & Colori**

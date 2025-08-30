# 🚀 OMNILY - SaaS Loyalty Platform Roadmap

## 📋 Overview del Progetto

**Nome Prodotto**: **OMNILY PRO** - *Everything Simply Professional* (Tutto Semplicemente Professionale)  
**Brand Promise**: La piattaforma loyalty universale professionale che rende tutto semplice

**Obiettivo**: Trasformare il sistema loyalty esistente in OMNILY PRO, piattaforma SaaS multi-tenant enterprise-ready

**Timeline**: 4-5 mesi  
**Target Market**: Negozi, ristoranti, centri estetici, palestre in Italia  
**Pricing Strategy**: Freemium → Basic €29 → Pro €99 → Enterprise €299

## 🏭 **ARCHITETTURA: ACCOUNT COMPLETAMENTE PULITI**

**⚠️ IMPORTANTE**: Il sistema SaaS sarà completamente separato dal sistema attuale per garantire:
- **Zero impatto** sul sistema in produzione
- **Database isolati** - nuovo Supabase project dedicato
- **Codebase separato** - nuovo repository `forno-loyalty-saas`
- **Infrastruttura indipendente** - account e servizi dedicati

### 🆕 **Setup Account Nuovi:**
- **Supabase**: Nuovo organization `omnily-pro-org`
- **Stripe**: Account business dedicato per billing OMNILY PRO
- **OneSignal**: Progetto separato `omnily-pro-notifications`
- **GitHub**: Repository `omnily-pro` da zero
- **Vercel**: Deployment separato `omnilypro.app`
- **Domini**: `*.omnilypro.app` per subdomain tenants

### 🎯 **Hardware Target: Z108 Android POS**
**Specifiche Hardware Ottimizzate:**
- **Android 14.0** - Compatibilità totale con React moderno
- **2.3GHz Octa-core + 4GB RAM** - Performance enterprise
- **NFC ISO/IEC 14443 A&B + Mifare** - Tessere loyalty native
- **8" touchscreen + customer display** - UX dual-screen
- **Stampante termica integrata** - Ricevute automatiche
- **WiFi 5G + 4G + Ethernet** - Connettività ridondante
- **Scanner 1D/2D** - QR codes e integrazioni future
- **Prezzo: $150** - ROI eccellente per feature enterprise

---

## 🚀 **FASE 0: SETUP INIZIALE ACCOUNT PULITI (Settimana 0)**

### ✅ **COMPLETATO 30 Agosto 2024 - Repository GitHub Setup**

**🎊 MILESTONE RAGGIUNTI:**
- ✅ **Account GitHub** `linolucci78-omnily` creato con successo
- ✅ **Repository** `omnilypro` inizializzato e strutturato
- ✅ **Autenticazione** Personal Access Token configurata
- ✅ **Struttura professionale** 5 cartelle principali create
- ✅ **Package.json** frontend (React) e backend (Node.js) configurati  
- ✅ **Environment template** .env.example con variabili complete
- ✅ **Sicurezza** .gitignore per proteggere chiavi segrete
- ✅ **README enterprise** con business model e roadmap Q1 2025
- ✅ **Git workflow** operativo - commit/push/sync funzionanti

**📊 Risultati Concreti:**
- Repository URL: https://github.com/linolucci78-omnily/omnilypro
- Struttura: frontend/ backend/ database/ docs/ hardware/
- Stack definito: React + Node.js + Supabase + Stripe + Z108
- Business model: Freemium €0 → Enterprise €299

**📅 Prossimo Step (31 Agosto):** Setup Supabase Multi-Tenant Database

---

### **Step 1: Nuovo Progetto Supabase SaaS**

1. **Creare nuovo Organization Supabase**
   - Nome: `forno-loyalty-saas-org`
   - Email business dedicato
   - Piano Pro per features enterprise

2. **Nuovo Project Database**
   - Nome: `forno-loyalty-saas-db`
   - Regione: EU West (Irlanda) per GDPR
   - Password complessa dedicata
   - Connection pooling attivo

3. **Setup iniziale Database**
   ```sql
   -- Abilita estensioni necessarie
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pg_cron";
   CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
   ```

### **Step 2: Nuovo Repository GitHub**

```bash
# Creare nuovo repository
gh repo create omnily-pro --public --description "OMNILY PRO - SaaS Multi-Tenant Loyalty Platform"

# Setup locale
mkdir omnily-pro
cd omnily-pro
git init
git remote add origin https://github.com/Plucci78/omnily-pro.git
```

### **Step 3: Setup Account Servizi**

**Stripe Business Account:**
- Account business separato
- Webhook endpoints dedicati
- Products e pricing configurati

**OneSignal Project:**
- Nuovo app per SaaS notifications
- SDK keys separate
- Segmentazione per tenants

**Domini:**
- Registrare `fornosaasloyalty.com`
- Wildcard SSL per `*.fornosaasloyalty.com`
- DNS configurato per multi-tenant

---

## 🏗️ FASE 1: FONDAMENTA MULTI-TENANT (Mese 1)

### 📊 Settimana 1-2: Database Multi-Tenant Schema

#### **1.1 Tabelle Core Organizzazioni**
```sql
-- Tabella principale organizzazioni
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- per subdomain
    domain VARCHAR(255), -- dominio personalizzato opzionale
    
    -- Piano e limiti
    plan_type VARCHAR(50) DEFAULT 'basic', -- basic, pro, enterprise
    plan_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    max_customers INTEGER DEFAULT 100,
    max_workflows INTEGER DEFAULT 5,
    max_notifications_month INTEGER DEFAULT 1000,
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    billing_email VARCHAR(255),
    next_billing_date TIMESTAMP,
    
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#8B4513',
    secondary_color VARCHAR(7) DEFAULT '#D4AF37',
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- soft delete
);

-- Tabella utenti organizzazione
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- super_admin, org_admin, manager, cashier
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(org_id, user_id)
);

-- Tabella inviti pending
CREATE TABLE organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **1.2 Migrazione Tabelle Esistenti**
```sql
-- Aggiungere org_id a tutte le tabelle esistenti
ALTER TABLE customers ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE nfc_tags ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE nfc_logs ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE transactions ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE email_workflows ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE notification_workflows ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE onesignal_subscriptions ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Creare indici per performance
CREATE INDEX idx_customers_org_id ON customers(org_id);
CREATE INDEX idx_nfc_tags_org_id ON nfc_tags(org_id);
CREATE INDEX idx_transactions_org_id ON transactions(org_id);
CREATE INDEX idx_workflows_org_id ON notification_workflows(org_id);

-- RLS (Row Level Security) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ... per tutte le tabelle
```

#### **1.3 Seed Data & Migration Script**
```javascript
// scripts/migrate-to-multitenant.js
const { createClient } = require('@supabase/supabase-js');

async function migrateToMultiTenant() {
    // 1. Creare organizzazione default
    const defaultOrg = await supabase
        .from('organizations')
        .insert({
            name: 'Forno Loyalty (Legacy)',
            slug: 'default',
            plan_type: 'enterprise'
        })
        .select()
        .single();
    
    // 2. Associare tutti i dati esistenti all'org default
    await supabase
        .from('customers')
        .update({ org_id: defaultOrg.id })
        .is('org_id', null);
    
    // 3. Creare super admin
    // ... resto della migrazione
}
```

### 🔐 Settimana 3: Sistema Autenticazione Multi-Tenant

#### **2.1 Middleware Tenant Context**
```javascript
// src/contexts/TenantContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
    const [currentOrg, setCurrentOrg] = useState(null);
    const [userOrgs, setUserOrgs] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Carica organizzazioni dell'utente
    const loadUserOrganizations = async () => {
        // ... logica caricamento
    };
    
    // Switch organizzazione
    const switchOrganization = async (orgId) => {
        // ... logica switch
    };
    
    return (
        <TenantContext.Provider value={{
            currentOrg,
            userOrgs,
            userRole,
            loading,
            switchOrganization,
            loadUserOrganizations
        }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within TenantProvider');
    }
    return context;
};
```

#### **2.2 Sistema Ruoli e Permessi**
```javascript
// src/utils/permissions.js
export const ROLES = {
    SUPER_ADMIN: 'super_admin', // Gestisce tutto il SaaS
    ORG_ADMIN: 'org_admin',     // Admin organizzazione
    MANAGER: 'manager',         // Gestisce clienti e workflow
    CASHIER: 'cashier'          // Solo NFC e vendite
};

export const PERMISSIONS = {
    // Clienti
    'customers.read': [ROLES.ORG_ADMIN, ROLES.MANAGER, ROLES.CASHIER],
    'customers.write': [ROLES.ORG_ADMIN, ROLES.MANAGER],
    'customers.delete': [ROLES.ORG_ADMIN],
    
    // Workflow
    'workflows.read': [ROLES.ORG_ADMIN, ROLES.MANAGER],
    'workflows.write': [ROLES.ORG_ADMIN, ROLES.MANAGER],
    'workflows.execute': [ROLES.ORG_ADMIN, ROLES.MANAGER, ROLES.CASHIER],
    
    // Analytics
    'analytics.view': [ROLES.ORG_ADMIN, ROLES.MANAGER],
    
    // Billing (solo org admin)
    'billing.manage': [ROLES.ORG_ADMIN],
    
    // Settings
    'settings.manage': [ROLES.ORG_ADMIN]
};

export const hasPermission = (userRole, permission) => {
    return PERMISSIONS[permission]?.includes(userRole) || false;
};
```

### 🎨 Settimana 4: UI Multi-Tenant

#### **3.1 Organization Switcher**
```jsx
// src/components/OrganizationSwitcher.jsx
import { useTenant } from '../contexts/TenantContext';

const OrganizationSwitcher = () => {
    const { currentOrg, userOrgs, switchOrganization } = useTenant();
    
    return (
        <div className="org-switcher">
            <select 
                value={currentOrg?.id || ''} 
                onChange={(e) => switchOrganization(e.target.value)}
                className="org-select"
            >
                {userOrgs.map(org => (
                    <option key={org.id} value={org.id}>
                        {org.name} ({org.plan_type})
                    </option>
                ))}
            </select>
            
            <div className="org-info">
                <span className="org-plan">{currentOrg?.plan_type}</span>
                <span className="org-usage">
                    {currentOrg?.customer_count}/{currentOrg?.max_customers} clienti
                </span>
            </div>
        </div>
    );
};
```

#### **3.2 Isolamento Dati nei Servizi**
```javascript
// src/services/tenantService.js
export class TenantService {
    constructor() {
        this.currentOrgId = null;
    }
    
    setCurrentOrg(orgId) {
        this.currentOrgId = orgId;
    }
    
    // Wrapper per query con tenant isolation
    async query(table) {
        if (!this.currentOrgId) {
            throw new Error('No organization context');
        }
        
        return supabase
            .from(table)
            .select('*')
            .eq('org_id', this.currentOrgId);
    }
    
    async insert(table, data) {
        return supabase
            .from(table)
            .insert({
                ...data,
                org_id: this.currentOrgId
            });
    }
}

export const tenantService = new TenantService();
```

---

## 💰 FASE 2: BILLING & SUBSCRIPTION (Mese 2)

### 💳 Settimana 1: Stripe Integration

#### **4.1 Setup Stripe**
```javascript
// src/services/stripeService.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeService = {
    // Creare customer Stripe
    async createCustomer(orgData) {
        return await stripe.customers.create({
            email: orgData.billing_email,
            name: orgData.name,
            metadata: {
                org_id: orgData.id
            }
        });
    },
    
    // Creare subscription
    async createSubscription(customerId, priceId) {
        return await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });
    },
    
    // Gestire webhook
    async handleWebhook(event) {
        switch (event.type) {
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionCancelled(event.data.object);
                break;
        }
    }
};
```

#### **4.2 Piani e Pricing**
```javascript
// src/config/plans.js
export const PLANS = {
    BASIC: {
        id: 'basic',
        name: 'Basic',
        price: 29,
        currency: 'EUR',
        interval: 'month',
        stripe_price_id: 'price_basic_monthly',
        features: {
            max_customers: 100,
            max_workflows: 5,
            max_notifications_month: 1000,
            email_support: true,
            analytics_basic: true
        }
    },
    
    PRO: {
        id: 'pro', 
        name: 'Pro',
        price: 99,
        currency: 'EUR',
        interval: 'month',
        stripe_price_id: 'price_pro_monthly',
        features: {
            max_customers: 1000,
            max_workflows: 50,
            max_notifications_month: 10000,
            email_support: true,
            phone_support: true,
            analytics_advanced: true,
            api_access: true,
            webhook_support: true
        }
    },
    
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise', 
        price: 299,
        currency: 'EUR',
        interval: 'month',
        stripe_price_id: 'price_enterprise_monthly',
        features: {
            max_customers: -1, // unlimited
            max_workflows: -1, // unlimited
            max_notifications_month: -1, // unlimited
            email_support: true,
            phone_support: true,
            priority_support: true,
            analytics_advanced: true,
            api_access: true,
            webhook_support: true,
            white_label: true,
            custom_domain: true,
            sso: true
        }
    }
};
```

### 📊 Settimana 2: Usage Tracking

#### **5.1 Sistema Metering**
```javascript
// src/services/usageService.js
export const usageService = {
    // Track uso risorse
    async trackUsage(orgId, resource, quantity = 1) {
        const today = new Date().toISOString().split('T')[0];
        
        await supabase
            .from('usage_tracking')
            .upsert({
                org_id: orgId,
                resource_type: resource, // customers, workflows, notifications
                date: today,
                quantity: quantity
            }, {
                onConflict: 'org_id,resource_type,date'
            });
    },
    
    // Controllo limiti
    async checkLimits(orgId) {
        const org = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
            
        const plan = PLANS[org.plan_type.toUpperCase()];
        
        // Controllo clienti
        const customerCount = await supabase
            .from('customers')
            .select('id', { count: 'exact' })
            .eq('org_id', orgId);
            
        if (plan.features.max_customers !== -1 && 
            customerCount.count >= plan.features.max_customers) {
            return {
                allowed: false,
                reason: 'customer_limit_reached',
                current: customerCount.count,
                max: plan.features.max_customers
            };
        }
        
        return { allowed: true };
    }
};
```

### 🔄 Settimana 3-4: Billing UI & Management

#### **6.1 Billing Dashboard**
```jsx
// src/components/BillingDashboard.jsx
const BillingDashboard = () => {
    const { currentOrg } = useTenant();
    const [usage, setUsage] = useState(null);
    const [invoices, setInvoices] = useState([]);
    
    return (
        <div className="billing-dashboard">
            {/* Piano corrente */}
            <div className="current-plan">
                <h3>Piano {currentOrg.plan_type}</h3>
                <div className="plan-price">
                    €{PLANS[currentOrg.plan_type.toUpperCase()].price}/mese
                </div>
                <button onClick={handleUpgrade}>Upgrade Piano</button>
            </div>
            
            {/* Usage metrics */}
            <div className="usage-metrics">
                <UsageMetric 
                    label="Clienti"
                    current={usage?.customers}
                    max={currentOrg.max_customers}
                />
                <UsageMetric 
                    label="Workflow"
                    current={usage?.workflows}
                    max={currentOrg.max_workflows}
                />
                <UsageMetric 
                    label="Notifiche (questo mese)"
                    current={usage?.notifications}
                    max={currentOrg.max_notifications_month}
                />
            </div>
            
            {/* Storico fatture */}
            <InvoiceHistory invoices={invoices} />
        </div>
    );
};
```

---

## 🎨 FASE 3: BRANDING & WHITE LABEL (Mese 3)

### 🖼️ Settimana 1: Customizzazione Brand

#### **7.1 Theme System**
```javascript
// src/contexts/ThemeContext.jsx
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { currentOrg } = useTenant();
    
    const theme = {
        colors: {
            primary: currentOrg?.primary_color || '#8B4513',
            secondary: currentOrg?.secondary_color || '#D4AF37',
            // ... altri colori derivati
        },
        logo: currentOrg?.logo_url,
        orgName: currentOrg?.name
    };
    
    // Inietta CSS variables
    useEffect(() => {
        if (currentOrg) {
            document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
            document.documentElement.style.setProperty('--color-secondary', theme.colors.secondary);
        }
    }, [currentOrg, theme]);
    
    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};
```

#### **7.2 Brand Settings UI**
```jsx
// src/components/BrandSettings.jsx
const BrandSettings = () => {
    const { currentOrg } = useTenant();
    const [settings, setSettings] = useState({
        logo: currentOrg?.logo_url || '',
        primaryColor: currentOrg?.primary_color || '#8B4513',
        secondaryColor: currentOrg?.secondary_color || '#D4AF37'
    });
    
    const handleSave = async () => {
        await supabase
            .from('organizations')
            .update({
                logo_url: settings.logo,
                primary_color: settings.primaryColor,
                secondary_color: settings.secondaryColor
            })
            .eq('id', currentOrg.id);
    };
    
    return (
        <div className="brand-settings">
            <h3>Personalizzazione Brand</h3>
            
            {/* Logo upload */}
            <div className="setting-group">
                <label>Logo Aziendale</label>
                <LogoUploader 
                    currentLogo={settings.logo}
                    onUpload={(url) => setSettings(prev => ({ ...prev, logo: url }))}
                />
            </div>
            
            {/* Color pickers */}
            <div className="setting-group">
                <label>Colore Primario</label>
                <ColorPicker 
                    value={settings.primaryColor}
                    onChange={(color) => setSettings(prev => ({ ...prev, primaryColor: color }))}
                />
            </div>
            
            <div className="setting-group">
                <label>Colore Secondario</label>
                <ColorPicker 
                    value={settings.secondaryColor}
                    onChange={(color) => setSettings(prev => ({ ...prev, secondaryColor: color }))}
                />
            </div>
            
            <button onClick={handleSave}>Salva Modifiche</button>
        </div>
    );
};
```

### 🌐 Settimana 2: Subdomain Routing

#### **8.1 Subdomain Detection**
```javascript
// src/utils/subdomainUtils.js
export const getSubdomain = () => {
    const hostname = window.location.hostname;
    
    // Ambiente sviluppo
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return null;
    }
    
    // Produzione: cliente1.loyalty-saas.com
    const parts = hostname.split('.');
    if (parts.length >= 3) {
        return parts[0]; // cliente1
    }
    
    return null;
};

export const redirectToSubdomain = (orgSlug) => {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    if (process.env.NODE_ENV === 'development') {
        // Dev: usa query param
        window.location.href = `${protocol}//${window.location.hostname}${port}?org=${orgSlug}`;
    } else {
        // Prod: usa subdomain
        window.location.href = `${protocol}//${orgSlug}.loyalty-saas.com`;
    }
};
```

#### **8.2 Routing Logic**
```jsx
// src/App.jsx
function App() {
    const [orgContext, setOrgContext] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const initializeApp = async () => {
            // Detect subdomain o query param
            const subdomain = getSubdomain();
            const orgParam = new URLSearchParams(window.location.search).get('org');
            const orgSlug = subdomain || orgParam;
            
            if (orgSlug) {
                // Carica organizzazione da slug
                const { data: org } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('slug', orgSlug)
                    .single();
                    
                if (org) {
                    setOrgContext(org);
                } else {
                    // Organizzazione non trovata
                    window.location.href = '/org-not-found';
                }
            }
            
            setLoading(false);
        };
        
        initializeApp();
    }, []);
    
    if (loading) return <LoadingScreen />;
    
    return (
        <TenantProvider initialOrg={orgContext}>
            <ThemeProvider>
                <Router>
                    {/* Routes dell'app */}
                </Router>
            </ThemeProvider>
        </TenantProvider>
    );
}
```

### 📧 Settimana 3-4: Email Templates Brandizzate

#### **9.1 Template Engine**
```javascript
// src/services/emailTemplateService.js
export const emailTemplateService = {
    async renderTemplate(templateType, data, orgId) {
        const org = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
            
        const baseTemplate = await this.getBaseTemplate(org.data);
        const contentTemplate = await this.getContentTemplate(templateType);
        
        return this.compile(baseTemplate, contentTemplate, data, org.data);
    },
    
    getBaseTemplate(org) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .header { 
                        background: ${org.primary_color}; 
                        color: white; 
                        padding: 20px; 
                    }
                    .logo { max-height: 60px; }
                    .footer { 
                        background: ${org.secondary_color}; 
                        padding: 15px; 
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${org.logo_url ? `<img src="${org.logo_url}" class="logo" alt="${org.name}">` : ''}
                    <h1>${org.name}</h1>
                </div>
                <div class="content">
                    {{CONTENT}}
                </div>
                <div class="footer">
                    <p>&copy; 2024 ${org.name}. Tutti i diritti riservati.</p>
                </div>
            </body>
            </html>
        `;
    }
};
```

---

## 📊 FASE 4: ANALYTICS & ENTERPRISE (Mese 4)

### 📈 Settimana 1-2: Dashboard Analytics

#### **10.1 Metriche Core**
```javascript
// src/services/analyticsService.js
export const analyticsService = {
    async getDashboardMetrics(orgId, dateRange) {
        const metrics = await Promise.all([
            this.getCustomerMetrics(orgId, dateRange),
            this.getWorkflowMetrics(orgId, dateRange),
            this.getNotificationMetrics(orgId, dateRange),
            this.getRevenueMetrics(orgId, dateRange)
        ]);
        
        return {
            customers: metrics[0],
            workflows: metrics[1], 
            notifications: metrics[2],
            revenue: metrics[3]
        };
    },
    
    async getCustomerMetrics(orgId, dateRange) {
        // Total clienti
        const totalCustomers = await supabase
            .from('customers')
            .select('id', { count: 'exact' })
            .eq('org_id', orgId);
            
        // Nuovi clienti nel periodo
        const newCustomers = await supabase
            .from('customers')
            .select('id', { count: 'exact' })
            .eq('org_id', orgId)
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
            
        // Clienti attivi (con transazioni nel periodo)
        const activeCustomers = await supabase
            .from('transactions')
            .select('customer_id', { count: 'exact' })
            .eq('org_id', orgId)
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
            
        // Retention rate
        // ... calcoli retention
        
        return {
            total: totalCustomers.count,
            new: newCustomers.count,
            active: activeCustomers.count,
            retention_rate: 0.75 // placeholder
        };
    }
};
```

#### **10.2 Charts Dashboard**
```jsx
// src/components/AnalyticsDashboard.jsx
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const AnalyticsDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });
    
    return (
        <div className="analytics-dashboard">
            <div className="metrics-cards">
                <MetricCard 
                    title="Clienti Totali"
                    value={metrics?.customers.total}
                    change={`+${metrics?.customers.new} questo mese`}
                    icon="👥"
                />
                <MetricCard 
                    title="Workflow Attivi"
                    value={metrics?.workflows.active}
                    change={`${metrics?.workflows.execution_rate}% esecuzione`}
                    icon="⚡"
                />
                <MetricCard 
                    title="Notifiche Inviate"
                    value={metrics?.notifications.sent}
                    change={`${metrics?.notifications.open_rate}% apertura`}
                    icon="📱"
                />
            </div>
            
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Crescita Clienti</h3>
                    <Line data={customerGrowthData} />
                </div>
                
                <div className="chart-container">
                    <h3>Performance Workflow</h3>
                    <Bar data={workflowPerformanceData} />
                </div>
                
                <div className="chart-container">
                    <h3>Distribuzione Clienti per Livello</h3>
                    <Doughnut data={customerLevelsData} />
                </div>
            </div>
        </div>
    );
};
```

### 🔌 Settimana 3: API & Webhook System

#### **11.1 API REST Completa**
```javascript
// api/v1/customers.js
import { Router } from 'express';
import { authenticateAPI, getTenantContext } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/customers
router.get('/', authenticateAPI, async (req, res) => {
    const { orgId } = getTenantContext(req);
    const { page = 1, limit = 50, search } = req.query;
    
    let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .range((page - 1) * limit, page * limit - 1);
        
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    
    res.json({
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
        }
    });
});

// POST /api/v1/customers
router.post('/', authenticateAPI, async (req, res) => {
    const { orgId } = getTenantContext(req);
    const customerData = req.body;
    
    // Controllo limiti piano
    const limitCheck = await usageService.checkLimits(orgId);
    if (!limitCheck.allowed) {
        return res.status(403).json({ 
            error: 'Customer limit reached',
            current: limitCheck.current,
            max: limitCheck.max
        });
    }
    
    const { data, error } = await supabase
        .from('customers')
        .insert({
            ...customerData,
            org_id: orgId
        })
        .select()
        .single();
        
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    
    // Track usage
    await usageService.trackUsage(orgId, 'customers');
    
    res.status(201).json({ data });
});

export default router;
```

#### **11.2 Webhook System**
```javascript
// src/services/webhookService.js
export const webhookService = {
    async sendWebhook(orgId, event, data) {
        const org = await supabase
            .from('organizations')
            .select('webhook_url, webhook_secret')
            .eq('id', orgId)
            .single();
            
        if (!org.data?.webhook_url) return;
        
        const payload = {
            event,
            data,
            timestamp: new Date().toISOString(),
            org_id: orgId
        };
        
        const signature = this.generateSignature(payload, org.data.webhook_secret);
        
        try {
            await fetch(org.data.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature
                },
                body: JSON.stringify(payload)
            });
            
            // Log webhook success
            await this.logWebhook(orgId, event, 'success');
        } catch (error) {
            // Log webhook failure
            await this.logWebhook(orgId, event, 'failed', error.message);
        }
    },
    
    // Trigger automatici
    async onCustomerCreated(customer) {
        await this.sendWebhook(customer.org_id, 'customer.created', customer);
    },
    
    async onPointsEarned(transaction) {
        await this.sendWebhook(transaction.org_id, 'points.earned', transaction);
    }
};
```

### 📚 Settimana 4: Documentation & API Docs

#### **12.1 API Documentation**
```markdown
# Loyalty SaaS API Documentation

## Authentication

All API requests require authentication using API keys:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.loyalty-saas.com/v1/customers
```

## Endpoints

### Customers

#### GET /v1/customers
List all customers for your organization.

**Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (max: 100, default: 50) 
- `search` (string): Search by name or email
- `level` (string): Filter by customer level

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.loyalty-saas.com/v1/customers?page=1&limit=10&search=mario"
```

#### POST /v1/customers
Create a new customer.

**Body:**
```json
{
  "name": "Mario Rossi",
  "email": "mario@example.com", 
  "phone": "+39 123 456 7890",
  "birth_date": "1990-01-15"
}
```
```

---

## 🚀 FASE 5: POLISH & LAUNCH (Mese 5)

### ⚡ Settimana 1: Performance Optimization

#### **13.1 Database Optimization**
```sql
-- Indici per performance
CREATE INDEX CONCURRENTLY idx_customers_org_search 
ON customers USING GIN (org_id, (name || ' ' || email) gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_transactions_org_date 
ON transactions (org_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_notifications_org_status 
ON notification_logs (org_id, status, created_at DESC);

-- Partitioning per tabelle grandi
CREATE TABLE notification_logs_2024_01 PARTITION OF notification_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### **13.2 Caching Strategy**
```javascript
// src/services/cacheService.js
import Redis from 'redis';

const redis = Redis.createClient(process.env.REDIS_URL);

export const cacheService = {
    // Cache metriche dashboard (TTL 5 minuti)
    async getDashboardMetrics(orgId) {
        const key = `dashboard:${orgId}`;
        const cached = await redis.get(key);
        
        if (cached) {
            return JSON.parse(cached);
        }
        
        const metrics = await analyticsService.getDashboardMetrics(orgId);
        await redis.setex(key, 300, JSON.stringify(metrics));
        
        return metrics;
    },
    
    // Cache configurazioni org (TTL 1 ora)
    async getOrgConfig(orgId) {
        const key = `org:${orgId}`;
        // ... logica simile
    }
};
```

### 🛡️ Settimana 2: Security & Compliance

#### **14.1 Security Audit**
- [ ] Rate limiting su API
- [ ] Input validation & sanitization
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Secure headers (HSTS, CSP, etc.)
- [ ] API key rotation
- [ ] Audit logging

#### **14.2 GDPR Compliance**
```javascript
// src/services/gdprService.js
export const gdprService = {
    // Esportazione dati cliente
    async exportCustomerData(customerId, orgId) {
        const data = await Promise.all([
            supabase.from('customers').select('*').eq('id', customerId).eq('org_id', orgId),
            supabase.from('transactions').select('*').eq('customer_id', customerId).eq('org_id', orgId),
            supabase.from('nfc_logs').select('*').eq('customer_id', customerId).eq('org_id', orgId)
        ]);
        
        return {
            customer: data[0].data[0],
            transactions: data[1].data,
            nfc_logs: data[2].data,
            exported_at: new Date().toISOString()
        };
    },
    
    // Cancellazione dati cliente
    async deleteCustomerData(customerId, orgId) {
        // Soft delete con anonimizzazione
        await supabase
            .from('customers')
            .update({
                name: '[DELETED]',
                email: '[DELETED]',
                phone: '[DELETED]',
                deleted_at: new Date().toISOString()
            })
            .eq('id', customerId)
            .eq('org_id', orgId);
    }
};
```

### 🎯 Settimana 3: Onboarding System

#### **15.1 Setup Wizard**
```jsx
// src/components/OnboardingWizard.jsx
const OnboardingWizard = () => {
    const [step, setStep] = useState(1);
    const [orgData, setOrgData] = useState({});
    
    const steps = [
        { title: "Informazioni Azienda", component: CompanyInfoStep },
        { title: "Personalizzazione", component: BrandingStep },
        { title: "Primo Cliente", component: FirstCustomerStep },
        { title: "Test NFC", component: NFCTestStep },
        { title: "Primo Workflow", component: WorkflowStep }
    ];
    
    return (
        <div className="onboarding-wizard">
            <div className="wizard-progress">
                {steps.map((s, i) => (
                    <div key={i} className={`step ${i + 1 <= step ? 'completed' : ''}`}>
                        {s.title}
                    </div>
                ))}
            </div>
            
            <div className="wizard-content">
                {React.createElement(steps[step - 1].component, {
                    data: orgData,
                    onUpdate: setOrgData,
                    onNext: () => setStep(step + 1),
                    onPrev: () => setStep(step - 1)
                })}
            </div>
        </div>
    );
};
```

### 🌐 Settimana 4: Marketing Site & Documentation

#### **16.1 Landing Page**
- Hero section con value proposition
- Pricing calculator interattivo
- Demo video del prodotto
- Testimonial clienti beta
- FAQ section
- Form di contatto/trial

#### **16.2 Knowledge Base**
- Guide setup iniziale
- Tutorial video
- Best practices workflow
- Troubleshooting comune
- API documentation
- Webhook examples

---

## 🎯 SUCCESS METRICS & KPI

### 📊 Metriche Business
- **MRR (Monthly Recurring Revenue)**: Target €10.000/mese entro 6 mesi
- **Customer Acquisition Cost**: <€150 per cliente
- **Customer Lifetime Value**: >€2.000
- **Churn Rate**: <5% mensile
- **Net Promoter Score**: >50

### 🚀 Metriche Tecniche  
- **Uptime**: >99.9%
- **API Response Time**: <200ms p95
- **Page Load Time**: <2 secondi
- **Error Rate**: <0.1%

### 👥 Metriche Adozione
- **Time to First Value**: <24 ore dall'iscrizione
- **Feature Adoption Rate**: >80% per funzioni core
- **Daily Active Organizations**: >200 entro 6 mesi

---

## 🚧 RISCHI E MITIGATION

### ⚠️ Rischi Tecnici
- **Database Performance**: Monitoring + scaling automatico
- **API Rate Limiting**: Implementazione progressive limits
- **Data Loss**: Backup automatici giornalieri + point-in-time recovery

### 💰 Rischi Business
- **Competizione**: Differenziazione tramite NFC + automazione AI
- **Customer Churn**: Onboarding migliore + customer success
- **Scaling Issues**: Architettura cloud-native fin dall'inizio

### 🔒 Rischi Compliance
- **GDPR**: Privacy by design + data minimization
- **PCI DSS**: Stripe gestisce pagamenti (no dati carta)
- **Audit**: Logging completo + trail di modifiche

---

## 💡 ROADMAP POST-LAUNCH

### 🤖 AI & Automation (Mesi 6-8)
- Raccomandazioni AI per workflow
- Segmentazione automatica clienti
- Predictive analytics per churn
- Chatbot supporto automatico

### 🌍 Espansione (Mesi 9-12)
- Localizzazione multi-lingua
- Integrazione POS maggiori (Shopify, WooCommerce)
- Mobile app nativa
- Marketplace integrazioni

### 🏢 Enterprise Features (Anno 2)
- SSO/SAML integration
- Advanced role management
- Custom reporting engine
- Multi-store management

---

## 🤝 TEAM & RESOURCES

### 👨‍💻 Sviluppo Necessario
- **Full-stack Developer**: Tu + eventualmente 1 junior
- **UI/UX Designer**: Freelance per restyling
- **DevOps**: Consulente per setup CI/CD

### 💰 Budget Stimato
- **Stripe fees**: 2.9% + €0.25 per transazione
- **Hosting**: ~€200/mese (Supabase Pro + CDN)
- **Design**: €3.000 one-time
- **Marketing**: €1.000/mese
- **Legale**: €2.000 per contratti/privacy

**TOTALE INVESTIMENTO**: ~€15.000 per primi 5 mesi

---

## 🎉 CONCLUSIONI

Con questa roadmap dettagliata hai tutto quello che serve per trasformare il tuo sistema loyalty in un SaaS di successo. 

**L'obiettivo è ambizioso ma assolutamente raggiungibile** perché:
- ✅ Hai già l'80% del prodotto funzionante
- ✅ Il mercato italiano loyalty è sottosservito  
- ✅ La tecnologia NFC ti differenzia
- ✅ L'automazione workflow è un game-changer

**Pronto a iniziare? Il primo step è il database multi-tenant!** 🚀

*"Il momento migliore per piantare un albero era 20 anni fa. Il secondo momento migliore è ora."* - Proverbio cinese
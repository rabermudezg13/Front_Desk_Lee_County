# Kelly Education Lee County - Analytics API Backend

Backend API con Python para análisis avanzado de datos y funcionalidades mejoradas del dashboard.

## 🚀 Características

- **FastAPI** para APIs REST rápidas y modernas
- **Firebase Admin SDK** para conectar con Firestore
- **Pandas** para análisis de datos
- **Plotly** para visualizaciones interactivas
- **Exportación** de datos en Excel, CSV, JSON
- **Analytics** en tiempo real
- **Reportes** automatizados

## 📋 Prerequisitos

- Python 3.8+
- Credenciales de Firebase (archivo JSON)
- Proyecto Firebase configurado

## 🔧 Instalación

1. **Crear entorno virtual:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

2. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

3. **Configurar credenciales de Firebase:**
   - Descargar el archivo de credenciales desde Firebase Console
   - Guardarlo como `firebase_credentials.json` en el directorio `backend/`

4. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

## 🏃‍♂️ Ejecutar el servidor

```bash
python run.py
```

El API estará disponible en:
- **Servidor**: http://localhost:8000
- **Documentación**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📊 Endpoints disponibles

### Analytics
- `GET /api/v1/analytics/summary` - Resumen básico de analytics
- `GET /api/v1/analytics/visits/trend` - Tendencia de visitas diarias
- `GET /api/v1/analytics/visits/types` - Distribución de tipos de visitas
- `GET /api/v1/analytics/visits/complete` - Analytics completo de visitas

### Reports
- `POST /api/v1/reports/generate` - Generar reportes
- `POST /api/v1/reports/export` - Exportar datos
- `GET /api/v1/reports/daily-summary` - Resumen diario

### Dashboard
- `GET /api/v1/dashboard/widgets` - Datos para widgets del dashboard
- `GET /api/v1/dashboard/chart/visits-trend` - Gráfico de tendencia
- `GET /api/v1/dashboard/chart/visit-types` - Gráfico de tipos de visitas
- `GET /api/v1/dashboard/real-time-stats` - Estadísticas en tiempo real

## 🔑 Obtener credenciales de Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar el proyecto "Kelly Education Lee County"
3. Project Settings ⚙️ → Service accounts
4. Generate new private key
5. Descargar el archivo JSON
6. Renombrar a `firebase_credentials.json`

## 🌐 Integración con Frontend

El API está configurado con CORS para permitir requests desde:
- https://kelly-education-lee-coun-a4aae.web.app
- http://localhost:3000 (desarrollo)

## 📦 Deployment

### Cloud Run (Recomendado)
```bash
# Crear Dockerfile
# Configurar Cloud Build
# Deploy a Cloud Run
```

### Cloud Functions
```bash
# Adaptar para Functions Framework
# Deploy con gcloud functions deploy
```

## 🔧 Desarrollo

Para desarrollo local con recarga automática:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📈 Monitoreo

- Health check: `GET /health`
- Métricas disponibles en `/metrics` (si se configura)
- Logs estructurados con uvicorn

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch de feature
3. Commit los cambios
4. Push al branch
5. Crear Pull Request
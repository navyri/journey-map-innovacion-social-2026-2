/* ============================================================
   CONFIGURACIÓN DE VAPE CYCLE · JOURNEY MAP
   ------------------------------------------------------------
   Ya está conectado a Supabase (proyecto "journey-map").
   El paso a paso completo está en SETUP.md:
     1) SQL Editor → script de la tabla journey_maps
     2) Settings → General  → Project URL
     3) Settings → API Keys → llave publishable (anon public)
   Si alguna credencial se vacía, la app cae a MODO LOCAL
   (guarda solo en ese dispositivo) para no perder la prueba.
   ============================================================ */
window.VAPE_CONFIG = {
    SUPABASE_URL: 'https://mvjtsgbfsyekwyqtaobo.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_1-fmQwXBBGPKfFSPA9JnAA_QfR91GPd',

    /* Contraseña del panel privado de los miembros de Vape Cycle */
    ADMIN_PASSWORD: 'InnovacionSocial20262',

    /* Nombre de la tabla creada en Supabase */
    TABLE: 'journey_maps'
};

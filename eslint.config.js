import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Configuración de ESLint (flat config) para MoviApoyo.
// Se apoya en typescript-eslint con chequeo de tipos habilitado, ya que la
// arquitectura Clean Architecture depende fuertemente de tipos correctos
// entre capas (Domain, Application, Infrastructure, Presentation).
export default tseslint.config(
  {
    // functions/ es un proyecto Node aparte (Cloud Functions), con su
    // propio package.json y tsconfig.json — se lintea/instala por separado
    // (ver functions/README.md), no como parte de esta app de Vite.
    ignores: ['dist', 'node_modules', 'coverage', 'functions'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs['recommended-latest'],
      jsxA11y.flatConfigs.recommended,
      // Debe ir al final: desactiva reglas de estilo que ESLint podría
      // discutir con Prettier (el formateo lo resuelve Prettier, no ESLint).
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      // Evita romper el Fast Refresh de Vite si un archivo exporta algo
      // que no sea un componente (permitiendo constantes, caso habitual
      // en archivos de configuración de rutas o contextos).
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Permite variables/args no usados si se prefijan con "_" (patrón
      // habitual para destructuring parcial o parámetros de interfaz).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Todo el logging debe pasar por shared/utils/Logger.ts (rule 28):
      // así se puede filtrar información sensible o redirigirlo en un único
      // lugar. La única excepción es el propio Logger (ver override abajo).
      'no-console': 'error',
    },
  },
  {
    files: ['src/shared/utils/Logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)

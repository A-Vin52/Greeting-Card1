
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Add any specific rules or overrides here
      "react/react-in-jsx-scope": "off", // Not needed for React 17+
    },
  },
];

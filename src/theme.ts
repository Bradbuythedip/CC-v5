import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      background: '#0a1f13',
      primary: '#00ff9d',
      secondary: '#1a472a',
    },
  },
  fonts: {
    heading: '"Space Mono", monospace',
    body: '"Space Mono", monospace',
  },
  styles: {
    global: {
      body: {
        bg: 'brand.background',
        color: 'white',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          bg: 'brand.primary',
          color: 'brand.background',
          _hover: {
            bg: 'brand.secondary',
            color: 'brand.primary',
          },
        },
        outline: {
          borderColor: 'brand.primary',
          color: 'brand.primary',
          _hover: {
            bg: 'brand.secondary',
          },
        },
      },
    },
  },
});

export default theme;
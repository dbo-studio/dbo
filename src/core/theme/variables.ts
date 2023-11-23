const phi = 1.61803398875;

const variables = {
  frameWidth: '600px',

  height: {
    normal: 56,
  },

  radius: {
    tiny: `${phi * 2}px`,
    small: `${phi * 5}px`,
    medium: `${phi * 16}px`,
    high: '50%',
  },
};

export default variables;

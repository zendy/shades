const globalScope = do {
  const actualScope = window ?? global;

  const methods = ({
    set: (key, value) => {
      actualScope[key] = value;
      return methods;
    },
    getOrCreate: (key, valueCreator) => {
      const existingValue = actualScope?.[key];

      if (!existingValue) {
        const newValue = valueCreator();
        actualScope[key] = newValue;
        return newValue;
      }

      return existingValue;
    },
    get: (key) => actualScope?.[key],
    has: (key) => !!actualScope?.[key]
  });

  methods;
}

export default globalScope;

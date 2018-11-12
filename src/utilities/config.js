import {
  when,
  isObjectLiteral,
  isDefined
} from '../utilities';

export const config = (original) => ({
  orDefaults: (defaultConfig) => original |> when(isObjectLiteral).otherwise(defaultConfig)
})

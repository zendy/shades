import tiza from 'tiza';
import { dasherize } from './utilities';

export const states = (selectors) => (
  Object.entries(selectors).reduce((result, [key, value]) => ({
    ...result,
    [`:${dasherize(key)}`]: value
  }), {})
);

const logMagenta = (...values) => tiza.bold().color('magenta').text(values.join(' ')).reset();
const logBlue    = (...values) => tiza.bold().color('cornflowerblue').text(values.join(' ')).reset();
const logPurple  = (...values) => tiza.bold().color('mediumorchid').text(values.join(' ')).reset()
const logOrange  = (...values) => tiza.bold().color('darkorange').text(values.join(' ')).reset();

const logError = () => tiza.bold().underline().color('darkorange').text('Error: ').reset();
const logWarning = () => tiza.bold().underline().color('mediumorchid').text('Warning: ').reset();
const logInfo = () => tiza.bold().text('Info: ').reset();

const shadesLog = (displayName = 'Shades') => {
  const logger = logBlue('<' + displayName + '> ');

  return {
    error:   (...data) => logger.log(logError(), data.join(' ')),
    warning: (...data) => logger.log(logWarning(), data.join(' ')),
    info:    (...data) => logger.log(logError(), data.join(' '))
  }
}

const runIfEnabled = (toggleSwitch) => (callbackFn) => (...args) => {
  if (toggleSwitch) return callbackFn(...args);
}

export const getLoggers = ({ showDebug, displayName }) => {
  const runner = runIfEnabled(showDebug);
  const logger = shadesLog(displayName);

  return ({
    magenta: logMagenta,
    blue:    logBlue,
    purple:  logPurple,
    orange:  logOrange,
    matchNotFound: runner(({ ruleName }) => (
      logger.info('No pattern for ', logMagenta(ruleName), ' was matched, and no default was specified.'))
    ),
    ...logger
  });
}

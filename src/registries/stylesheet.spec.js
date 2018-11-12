import {
  styleCache,
  stylesheetRegistry
} from './stylesheet';

describe('Stylesheet registry', () => {
  const fakeDocument = () => ({
    querySelector: jest.fn(),
    appendChild: jest.fn()
  })

  const fakeStylesheet = () => ({
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    insertRule: jest.fn(),
    addRule: jest.fn()
  })

  it.skip('should create a new stylesheet when one doesnt already exist', () => {
    const target = fakeDocument();
    const fakeSelector = 'lol-hello-there';
    const createRules = () => [
      'some-style: 1000000px',
      'color: black-on-black-on-black'
    ];

    const result = stylesheetRegistry.getSheetFor(target).insertStyles(
      styleCache.add(fakeSelector, createRules)
    );

    expect(result).toEqual(fakeSelector);
    expect(target.querySelector).toHaveBeenCalledWith('style[data-shades]');
    expect(target.appendChild).toHaveBeenCalled();
  });

  it('should create a new stylesheet when one doesnt already exist', () => {
    const target = fakeDocument();

    const result = stylesheetRegistry.getSheetFor(target);

    expect(target.querySelector).toHaveBeenCalledWith('style[data-shades]');
    expect(target.appendChild).toHaveBeenCalled();
    expect(result.insertStyles).toBeDefined();
  });

  it('should use the existing stylesheet if it already exists', () => {
    const target = fakeDocument();

    const firstSheet = stylesheetRegistry.getSheetFor(target);
    const secondSheet = stylesheetRegistry.getSheetFor(target);

    expect(target.querySelector).toHaveBeenCalledTimes(1);
    expect(target.appendChild).toHaveBeenCalledTimes(1);
    expect(firstSheet.insertStyles).toBeDefined();
    expect(secondSheet).toBe(firstSheet);
  })
});

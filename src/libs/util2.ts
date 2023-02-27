import BigNumber from 'bignumber.js';

export const convertToLocalString = (
  value: BigNumber.Value,
  precision?: number,
): string => {
  return BigNumber(value)
    .decimalPlaces(precision ? precision : 4, BigNumber.ROUND_FLOOR)
    .toNumber()
    .toLocaleString();
};
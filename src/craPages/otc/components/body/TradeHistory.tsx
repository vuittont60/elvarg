import { useMemo, useContext } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell, { TableCellProps } from '@mui/material/TableCell';
import format from 'date-fns/format';
import { ERC20__factory } from '@dopex-io/sdk';

import Typography from 'components/UI/Typography';

import { OtcContext } from 'contexts/Otc';
import { WalletContext } from 'contexts/Wallet';

import sanitizeOptionSymbol from 'utils/general/sanitizeOptionSymbol';
import smartTrim from 'utils/general/smartTrim';
import getUserReadableAmount from 'utils/contracts/getUserReadableAmount';

const TableHeader = ({
  children,
  align = 'left',
  textColor = 'text-stieglitz',
}) => {
  return (
    <TableCell
      align={align as TableCellProps['align']}
      component="th"
      className="bg-cod-gray border-1 border-umbra py-1"
    >
      <Typography variant="h6" className={`${textColor}`}>
        {children}
      </Typography>
    </TableCell>
  );
};

const TableBodyCell = ({
  children,
  align = 'left',
  textColor = 'text-stieglitz',
}) => {
  return (
    <TableCell
      align={align as TableCellProps['align']}
      component="td"
      className="bg-cod-gray border-0"
    >
      <Typography variant="h6" className={`${textColor}`}>
        {children}
      </Typography>
    </TableCell>
  );
};

const TradeHistory = () => {
  const { tradeHistoryData } = useContext(OtcContext);
  const { accountAddress, provider } = useContext(WalletContext);

  const sanitizedData = useMemo(() => {
    return tradeHistoryData.map((entry) => {
      const quote = '-';
      // sanitizeOptionSymbol(
      //   await ERC20__factory.connect(entry.quote, provider).symbol()
      // );
      const base = '-';
      // sanitizeOptionSymbol(
      //   await ERC20__factory.connect(entry.base, provider).symbol()
      // );
      return {
        quote,
        base,
        sendAmount: getUserReadableAmount(entry.sendAmount),
        receiveAmount: getUserReadableAmount(entry.receiveAmount),
        dealer: smartTrim(entry.dealer, 10),
        counterParty: smartTrim(entry.counterParty, 10),
        timestamp: entry.timestamp,
        isUser:
          accountAddress === entry.dealer ||
          accountAddress === entry.counterParty,
      };
    });
  }, [tradeHistoryData, /*provider, */ accountAddress]);

  return (
    <TableContainer className="rounded-lg border border-umbra overflow-x-auto">
      <Table aria-label="trade history table" className="bg-umbra">
        <TableHead className="bg-umbra">
          <TableRow className="bg-umbra">
            <TableHeader align="left">Dealer</TableHeader>
            <TableHeader align="left">Quote</TableHeader>
            <TableHeader align="left">Sent</TableHeader>
            <TableHeader align="center">Time</TableHeader>
            <TableHeader align="right">Received</TableHeader>
            <TableHeader align="right">Base</TableHeader>
            <TableHeader align="right">Counter-party</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {tradeHistoryData &&
            sanitizedData?.map((row, index) => (
              <TableRow key={index}>
                <TableBodyCell align="left" textColor="white">
                  {row.dealer}
                </TableBodyCell>
                <TableBodyCell align="left">{row.quote}</TableBodyCell>
                <TableBodyCell align="left">{row.sendAmount}</TableBodyCell>
                <TableBodyCell align="center" textColor="white">
                  {format(row.timestamp * 1000, 'KK:mmaa d LLL yy')}
                </TableBodyCell>
                <TableBodyCell align="right">{row.receiveAmount}</TableBodyCell>
                <TableBodyCell align="right">{row.base}</TableBodyCell>
                <TableBodyCell align="right" textColor="white">
                  {row.counterParty}
                </TableBodyCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TradeHistory;
import { useCallback, useMemo } from 'react';

import { BigNumber } from 'ethers';

import { IconButton } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import IosShare from '@mui/icons-material/IosShare';
import { formatDistance } from 'date-fns';

import cx from 'classnames';

import Countdown from 'react-countdown';

import { useBoundStore } from 'store';

import useSendTx from 'hooks/useSendTx';
import useShare from 'hooks/useShare';

import CustomButton from 'components/UI/Button';
import Typography from 'components/UI/Typography';

import getUserReadableAmount from 'utils/contracts/getUserReadableAmount';
import formatAmount from 'utils/general/formatAmount';

const PositionsTable = ({ tab }: { tab: string }) => {
  const sendTx = useSendTx();

  const {
    signer,
    optionScalpUserData,
    optionScalpData,
    updateOptionScalp,
    updateOptionScalpUserData,
    uniArbPrice,
    uniWethPrice,
    selectedPoolName,
  } = useBoundStore();

  const markPrice = useMemo(() => {
    if (selectedPoolName === 'ETH') return uniWethPrice;
    else if (selectedPoolName === 'ARB') return uniArbPrice;
    return BigNumber.from('0');
  }, [uniWethPrice, uniArbPrice, selectedPoolName]);

  const share = useShare((state) => state.open);

  const handleShare = useCallback(
    (position: any) => {
      if (!optionScalpData) return;

      const { entry, pnl, margin, size, isShort, closePrice, isOpen } =
        position;

      const leverage =
        size /
        getUserReadableAmount(
          position.margin,
          optionScalpData?.quoteDecimals.toNumber()
        );

      const _markPrice: any = formatAmount(
        isOpen
          ? getUserReadableAmount(isOpen ? markPrice : closePrice, 6)
          : closePrice,
        4
      );

      const { baseSymbol, quoteSymbol } = optionScalpData;

      if (!baseSymbol || !quoteSymbol || !markPrice) return;
      share({
        title: (
          <Typography variant="h5" className="font-bold shadow-2xl">
            <span className={cx(isShort ? 'text-red-500' : 'text-green-500')}>
              {isShort ? 'Short' : 'Long'}
            </span>
            {' | '}
            <span>{formatAmount(leverage, 1)}x</span>
            {' | '}
            <span>{`${baseSymbol}${quoteSymbol}`}</span>
          </Typography>
        ),
        percentage:
          (pnl /
            getUserReadableAmount(
              margin,
              optionScalpData?.quoteDecimals.toNumber()
            )) *
          100,
        customPath: `/scalps/${selectedPoolName}`,
        stats: [
          { name: 'Entry Price', value: `$${entry}` },
          {
            name: isOpen ? 'Mark Price' : 'Close Price',
            value: `$${_markPrice}`,
          },
        ],
      });
    },
    [share, optionScalpData, markPrice, selectedPoolName]
  );

  const handleClose = useCallback(
    async (id: BigNumber) => {
      try {
        await sendTx(
          optionScalpData?.optionScalpContract.connect(signer),
          'closePosition',
          [id]
        );
      } catch (e) {}
      await updateOptionScalp();
      await updateOptionScalpUserData();
    },
    [
      optionScalpData,
      signer,
      sendTx,
      updateOptionScalp,
      updateOptionScalpUserData,
    ]
  );

  const positions = useMemo(() => {
    const filtered: any = [];
    if (!optionScalpData) return filtered;
    let { quoteDecimals, baseDecimals, inverted } = optionScalpData;

    if (!quoteDecimals || !baseDecimals) return;

    optionScalpUserData?.scalpPositions?.map((position) => {
      if (
        (tab === 'Open' && position.isOpen) ||
        (tab === 'Closed' && !position.isOpen)
      ) {
        const entry = formatAmount(
          inverted
            ? 1 /
                getUserReadableAmount(position.entry, quoteDecimals.toNumber())
            : getUserReadableAmount(position.entry, quoteDecimals.toNumber()),
          4
        );

        const size = getUserReadableAmount(
          position.size,
          quoteDecimals.toNumber()
        );

        const liquidationPrice = formatAmount(
          inverted
            ? 1 /
                getUserReadableAmount(
                  position.liquidationPrice,
                  quoteDecimals.toNumber()
                )
            : getUserReadableAmount(
                position.liquidationPrice,
                quoteDecimals.toNumber()
              ),
          4
        );

        const positions = formatAmount(
          getUserReadableAmount(position.positions, quoteDecimals.toNumber()),
          5
        );

        const pnl = getUserReadableAmount(
          position.pnl,
          quoteDecimals.toNumber()
        );

        const variation = position.pnl
          .add(position.premium)
          .add(position.fees)
          .mul(10 ** optionScalpData!.quoteDecimals!.toNumber())
          .div(position.positions.abs());

        const closePrice = getUserReadableAmount(
          position.isShort
            ? position.entry.sub(variation)
            : position.entry.add(variation),
          optionScalpData?.quoteDecimals!.toNumber()!
        );

        const openedAt = position.openedAt.toNumber();

        const timeframe = position.timeframe.toNumber();

        filtered.push({
          ...position,
          entry,
          liquidationPrice,
          positions,
          pnl,
          closePrice,
          size,
          timeframe,
          openedAt,
        });
      }
    });
    return filtered;
  }, [optionScalpUserData, tab, optionScalpData]);

  const tableHeadings = useMemo(() => {
    return [
      'Size',
      'Margin',
      'PnL',
      'Entry',
      tab === 'Closed' ? 'Close price' : 'Liq. Price',
      tab === 'Closed' ? 'Opened At' : 'Expiry',
    ];
  }, [tab]);

  const positionKeys = useMemo(() => {
    return [
      'positions',
      'margin',
      'pnl',
      'entry',
      tab === 'Closed' ? 'closePrice' : 'liquidationPrice',
      tab === 'Closed' ? 'openedAt' : 'timeframe',
    ];
  }, [tab]);

  const getCellComponent = useCallback(
    (key: string, position: any) => {
      if (!optionScalpData) return null;
      // if (key === 'positions');
      let rightContent: string | null = null;
      let styles = '';
      let data = position[key];
      let dataStyle = '';
      let rightContentStyle = '';

      if (key === 'positions') {
        rightContent = optionScalpData?.baseSymbol ?? '';
        dataStyle += (
          optionScalpData.inverted ? !position.isShort : position.isShort
        )
          ? 'text-[#FF617D]'
          : 'text-[#6DFFB9]';

        rightContentStyle = dataStyle + ' text-xs hidden md:inline-block';
        data = (
          optionScalpData?.inverted ? !position.isShort : position.isShort
        )
          ? '-' + data
          : '+' + data;
      }

      if (key === 'pnl') {
        dataStyle = cx(data < 0 ? 'text-[#FF617D]' : 'text-[#6DFFB9]');
        data = (
          <Tooltip
            title={
              <div>
                <div>{`Fees ${formatAmount(
                  getUserReadableAmount(
                    position.fees,
                    optionScalpData?.quoteDecimals.toNumber()
                  ),
                  4
                )}`}</div>
                <div>{`Premium ${formatAmount(
                  getUserReadableAmount(
                    position.premium,
                    optionScalpData?.quoteDecimals.toNumber()
                  ),
                  4
                )}`}</div>
              </div>
            }
          >
            <span>{`${formatAmount(data.toFixed(4), 2)} (${formatAmount(
              (position.pnl /
                getUserReadableAmount(
                  position.margin,
                  optionScalpData?.quoteDecimals.toNumber()
                )) *
                100,
              1
            )}%)`}</span>
          </Tooltip>
        );
      }

      if (key === 'openedAt') {
        data = formatDistance(data * 1000, Number(new Date())) + ' ago';
      }

      if (key === 'margin' || key === 'premium') {
        data = formatAmount(
          getUserReadableAmount(
            data,
            optionScalpData?.quoteDecimals.toNumber()
          ),
          4
        );
        rightContent = optionScalpData.quoteSymbol;
        rightContentStyle += ' text-xs hidden md:inline-block';
      }

      if (key === 'timeframe') {
        styles = 'flex flex-row items-center';
        data = (
          <Countdown
            date={new Date((position.openedAt + position.timeframe) * 1000)}
            renderer={({ minutes, seconds }) => {
              return (
                <span className="text-xs md:text-sm text-white pt-1">
                  {minutes}m {seconds}s
                </span>
              );
            }}
          />
        );

        rightContent = `(${position.timeframe / 60}m)`;
        rightContentStyle += ' text-xs mt-1';
      }

      if (key === 'closePrice') {
        data = formatAmount(data, 4);
      }

      return (
        <span
          className={cx(
            styles,
            'text-xs md:text-sm text-left w-full text-white space-x-2 md:space-x-1'
          )}
        >
          <span className={dataStyle}>{data}</span>
          <span className={rightContentStyle}>{rightContent}</span>
        </span>
      );
    },
    [optionScalpData]
  );

  return (
    <div className="rounded-lg bg-inherit w-fit-content h-fit-content px-5 flex flex-row">
      {positions.length !== 0 ? (
        <div className="w-full h-full mb-4">
          <div className="flex flex-col space-y-4 py-2">
            <div className="flex flex-row w-full items-center justify-between">
              {tableHeadings.map((heading, index) => (
                <span key={index} className="text-xs md:text-sm w-full">
                  {heading}
                </span>
              ))}
              <div className="w-full"></div>
            </div>
            {positions.map((position: any, index1: number) => (
              <div
                key={index1}
                className="flex flex-row w-full justify-center items-center space-x-2 md:space-x-0"
              >
                {positionKeys.map((info) => getCellComponent(info, position))}
                <div className="flex flex-row justify-end w-full">
                  {position.isOpen && (
                    <CustomButton
                      className="cursor-pointer text-white w-2"
                      color={'primary'}
                      onClick={() => handleClose(position.id)}
                    >
                      <span className="text-xs md:sm">Close</span>
                    </CustomButton>
                  )}
                  <IconButton
                    aria-label="share"
                    aria-haspopup="true"
                    onClick={() => handleShare(position)}
                    className="flex"
                    size="small"
                  >
                    <IosShare className="fill-current text-white opacity-90 hover:opacity-100 text-lg" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <span className="ml-auto mr-auto text-[0.8rem] h-full mb-10">
          Your {tab === 'Open' ? 'active' : 'closed'} positions will appear here
        </span>
      )}
    </div>
  );
};

export default PositionsTable;
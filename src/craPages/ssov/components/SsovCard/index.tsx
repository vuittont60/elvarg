import cx from 'classnames';
import Box from '@material-ui/core/Box';

import CustomButton from 'components/UI/CustomButton';
import Typography from 'components/UI/Typography';
import InfoBox from '../InfoBox';

import Coin from 'assets/icons/Coin';
import Action from 'assets/icons/Action';

import formatAmount from 'utils/general/formatAmount';

import { SSOV_MAP } from 'constants/index';
import ssovInfo from 'constants/ssovInfo';

import styles from './styles.module.scss';
import getUserReadableAmount from 'utils/contracts/getUserReadableAmount';

function SsovCard(props) {
  const { className, data } = props;

  const { currentEpoch, totalEpochDeposits, apy, tvl, name, type } = data;

  const info = [
    {
      heading: 'APY',
      value: `${apy === 0 ? '...' : `${apy}%`}`,
      Icon: Action,
      tooltip:
        type === 'put'
          ? 'This is the base APY calculated from Curve 2Pool Fees and Rewards'
          : ssovInfo[name].aprToolTipMessage,
    },
    {
      heading: 'TVL',
      value: tvl === 0 ? '...' : formatAmount(tvl, 0, true),
      Icon: Coin,
    },
    {
      heading: 'DEPOSITS',
      value: `${formatAmount(
        getUserReadableAmount(totalEpochDeposits, 18),
        0,
        true
      )}`,
      imgSrc: type === 'put' ? '/assets/2crv.png' : SSOV_MAP[name].imageSrc,
    },
  ];

  return (
    <Box className={cx('p-[1px] rounded-xl', styles[name], styles.Box)}>
      <Box
        className={cx(
          'flex flex-col bg-cod-gray p-4 rounded-xl h-full mx-auto',
          className
        )}
      >
        <Box>
          <Box className="flex flex-row mb-4">
            <Box className="mr-4 h-8 max-w-14 flex flex-row">
              <img
                className="w-9 h-9"
                src={SSOV_MAP[name].imageSrc}
                alt={name}
              />
            </Box>
            <Box className="flex flex-grow items-center justify-between">
              <Typography variant="h4" className="mr-2 font-bold">
                {name}
              </Typography>
              <img
                src={'/assets/' + type + 's.svg'}
                className="w-12"
                alt={type}
              />
            </Box>
          </Box>
          <Box className="grid grid-cols-3 gap-2 mb-2">
            {info.map((item) => {
              return <InfoBox key={item.heading} {...item} />;
            })}
          </Box>
          <CustomButton
            size="medium"
            className="my-4"
            href={`/ssov/${type}/${name}`}
            fullWidth
          >
            Manage
          </CustomButton>
          <Typography variant="h6" className="text-stieglitz">
            Epoch {currentEpoch}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default SsovCard;

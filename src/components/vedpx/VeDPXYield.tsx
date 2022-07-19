import { useCallback, useContext, useMemo } from 'react';
import { utils as ethersUtils } from 'ethers';
import { VeDPXYieldDistributor__factory } from '@dopex-io/sdk';
import Box from '@mui/material/Box';

import WalletButton from 'components/common/WalletButton';
import Typography from 'components/UI/Typography';
import NumberDisplay from 'components/UI/NumberDisplay';
import InfoTooltip from 'components/UI/InfoTooltip';

import { VeDPXContext, vedpxYieldDistributorAddress } from 'contexts/VeDPX';
import { WalletContext } from 'contexts/Wallet';

import formatAmount from 'utils/general/formatAmount';

import useSendTx from 'hooks/useSendTx';

const VeDPXYield = () => {
  const { accountAddress, signer } = useContext(WalletContext);
  const { userData, data, updateData, updateUserData } =
    useContext(VeDPXContext);

  const sendTx = useSendTx();

  const handleCheckpoint: any = async () => {
    if (!signer || !accountAddress) return;
    const vedpxYieldDistributor = VeDPXYieldDistributor__factory.connect(
      vedpxYieldDistributorAddress,
      signer
    );

    await sendTx(vedpxYieldDistributor.checkpoint());

    await updateData();
    await updateUserData();
  };

  const handleClaim = useCallback(async () => {
    if (!signer || !accountAddress) return;
    const vedpxYieldDistributor = VeDPXYieldDistributor__factory.connect(
      vedpxYieldDistributorAddress,
      signer
    );

    await sendTx(vedpxYieldDistributor.getYield());
  }, [accountAddress, sendTx, signer]);

  const apy = useMemo(() => {
    const dpxEmittedInAYear = 41.5 * 365;
    const totalDpx = Number(ethersUtils.formatEther(data.vedpxTotalSupply));

    return (dpxEmittedInAYear / totalDpx) * 100;
  }, [data.vedpxTotalSupply]);

  return (
    <Box>
      <Box className="mb-4">
        <Typography variant="h4" component="h2" className="mb-1">
          veDPX Yield
        </Typography>
        <Typography variant="h6" component="p" color="stieglitz">
          veDPX earns a yield from incentivized DPX rewards and protocol fees
          altogether
        </Typography>
      </Box>
      <Box className="bg-cod-gray rounded-2xl p-3 w-96">
        <Box className="flex space-x-2 w-full items-center mb-3">
          <img
            className="w-10 h-10 border border-mineshaft rounded-full"
            src="/images/tokens/dpx.svg"
            alt="DPX"
          />
          <Box className="flex-grow font-">
            <Typography variant="h5">veDPX</Typography>
            <Typography variant="h6" color="stieglitz">
              Earn DPX
            </Typography>
          </Box>
          {!userData.vedpxBalance.isZero() && !userData.userIsInitialized ? (
            <WalletButton
              className="justify-self-end"
              onClick={handleCheckpoint}
            >
              Checkpoint
            </WalletButton>
          ) : null}
        </Box>
        <Box className="flex justify-between items-center p-3 bg-umbra rounded-xl w-full mb-3">
          <Box>
            <Typography
              variant="h6"
              color="stieglitz"
              className="mb-1.5 font-medium"
            >
              DPX Earned
            </Typography>
            <Typography variant="h5" className="font-medium">
              <NumberDisplay n={userData.dpxEarned} decimals={18} /> DPX
            </Typography>
          </Box>
          <Box>
            <WalletButton
              className="justify-self-end"
              onClick={handleClaim}
              disabled={userData.dpxEarned.isZero()}
            >
              Claim
            </WalletButton>
          </Box>
        </Box>
        <Box className="flex space-x-4 rounded-xl">
          <Box className="p-3 bg-umbra rounded-xl w-full">
            <Typography
              variant="h6"
              color="stieglitz"
              className="mb-1.5 font-medium"
            >
              Yield Rate
            </Typography>
            <Typography variant="h5" className="font-medium">
              41.5 DPX/day
            </Typography>
          </Box>
          <Box className="p-3 bg-umbra rounded-xl w-full">
            <Typography
              variant="h6"
              color="stieglitz"
              className="mb-1.5 font-medium"
            >
              APY{' '}
              <InfoTooltip
                title="This considers 1 veDPX = 1 DPX (1 DPX locked for 4 years)"
                iconClassName="w-4 h-4"
              />
            </Typography>
            <Typography variant="h5" className="font-medium">
              {formatAmount(apy, 2)} %{' '}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VeDPXYield;
import { useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HistoryIcon from '@mui/icons-material/History';
import Checkbox from '@mui/material/Checkbox';
import grey from '@mui/material/colors/grey';

import AppBar from 'components/AppBar';
import Typography from 'components/UI/Typography';
import OtcBanner from './components/OtcBanner';
import IndicativeRfqTable from './components/body/IndicativeRfqTable';
import RfqForm from './components/RfqForm';
import TradeHistory from './components/body/TradeHistory';
import LiveOrders from './components/body/LiveOrders';
import Switch from 'components/UI/Switch';
import Accordion from 'components/UI/Accordion';
import UserDeposits from './components/body/UserDeposits';
import Register from './components/Dialogs/Register';
import CustomButton from 'components/UI/CustomButton';
import content from './components/OtcBanner/content.json';

import { OtcContext } from 'contexts/Otc';
import { WalletContext } from 'contexts/Wallet';

const MARKETS_PLACEHOLDER = [
  {
    symbol: 'USDT',
    icon: '/assets/usdt.svg',
    asset: 'USD Tether',
    pair: 'USDT/USDT',
  },
];

const OTC = () => {
  const { user, escrowData, setSelectedQuote } = useContext(OtcContext);
  const { accountAddress } = useContext(WalletContext);

  const [state, setState] = useState({
    trade: true,
    history: false,
  });
  const [selectedToken, setSelectedToken] = useState(MARKETS_PLACEHOLDER[0]);

  const [dialogState, setDialogState] = useState({
    open: true,
    handleClose: () => {},
  });

  const [isLive, setIsLive] = useState(false);
  const [filterFulfilled, setFilterFulfilled] = useState(false);

  const handleFilterFulfilled = useCallback((e) => {
    setFilterFulfilled(e.target.checked);
  }, []);

  const handleUpdateState = useCallback((trade, history) => {
    setState({ trade, history });
  }, []);

  const handleSelection = useCallback((token) => {
    setSelectedToken(token);
    setSelectedQuote({
      address: '',
      symbol: token,
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prevState) => ({ ...prevState, open: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleLiveRfq = useCallback((e) => {
    setIsLive(e.target.checked);
  }, []);

  return (
    <Box className="bg-black h-screen">
      <AppBar active="OTC" />
      {accountAddress ? (
        <Register open={dialogState.open} handleClose={handleClose} />
      ) : null}
      <Box className="container pt-32 mx-auto px-4 lg:px-0 h-full">
        <Box className="grid grid-cols-10 gap-4">
          <Box className="flex flex-col col-span-2">
            <OtcBanner
              title={content.banner.title}
              body={content.banner.body}
              bottomElement={
                <CustomButton
                  variant="contained"
                  size="small"
                  color="white"
                  className="bg-white hover:bg-white p-0"
                >
                  <a
                    href="https://chat.blockscan.com/start"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full"
                  >
                    <Typography variant="h6" className="text-primary">
                      {content.banner.bottomElementText} &rarr;
                    </Typography>
                  </a>
                </CustomButton>
              }
            />
            <Typography variant="h5" className="text-stieglitz py-3">
              Views
            </Typography>
            <Box className="flex flex-col justify-between space-y-4">
              <Box className="flex flex-col">
                <Box
                  role="button"
                  className={`flex space-x-4 p-2 rounded-xl ${
                    state.trade ? 'bg-cod-gray' : null
                  }`}
                  onClick={() => handleUpdateState(true, false)}
                >
                  <SwapHorizIcon className="my-auto" />
                  <Typography
                    variant="h6"
                    className={`hover:bg-cod-gray rounded-lg py-4`}
                  >
                    Trade
                  </Typography>
                </Box>

                <Box
                  role="button"
                  className={`flex space-x-4 p-2 rounded-xl ${
                    state.history ? 'bg-cod-gray' : null
                  }`}
                  onClick={() => handleUpdateState(false, true)}
                >
                  <HistoryIcon className="my-auto" />
                  <Box className="flex space-x-2">
                    <Typography
                      variant="h6"
                      role="button"
                      className="rounded-lg py-4"
                      // handleUpdateState(false, true)
                    >
                      History
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h5" className="text-stieglitz py-3">
                  Markets
                </Typography>
                {escrowData.quotes?.map((asset, index) => {
                  return (
                    <Box
                      key={index}
                      className={`flex hover:bg-cod-gray p-2 rounded-lg ${
                        asset.symbol === selectedToken.symbol
                          ? 'bg-cod-gray'
                          : null
                      }`}
                      onClick={() => handleSelection(asset)}
                    >
                      <img
                        src={`/assets/${asset.symbol.toLowerCase()}.svg`}
                        alt={`${asset.symbol}`}
                        className="p-2 h-12"
                      />
                      <Typography
                        variant="h5"
                        className="self-center"
                      >{`${asset.symbol}`}</Typography>
                    </Box>
                  );
                })}
              </Box>
              <Box>
                <Accordion
                  summary="How does OTC options work?"
                  details={`OTC markets consist of dealer-brokers and counter-parties. 
                Dealer-brokers place orders to sell/buy a certain asset, while counter-parties 
                fulfill these orders via a p2p trade with these brokers via an ongoing open-trade. 
                Settlement prices may be made via an agreement made through negotiations taken place in chatrooms.`}
                  footer={<Link to="#">Read More</Link>}
                />
              </Box>
            </Box>
          </Box>
          <Box className="flex flex-col col-span-6 space-y-4">
            {state.trade ? (
              <>
                <Box className="flex justify-between">
                  <Typography variant="h5" className="font-bold my-auto">
                    {isLive ? 'Live Orders' : 'RFQs'}
                  </Typography>
                  <Box className="flex space-x-4">
                    <Box className="flex">
                      <Typography variant="h5" className="my-auto">
                        Hide Fulfilled
                      </Typography>
                      <Checkbox
                        onClick={handleFilterFulfilled}
                        sx={{
                          color: grey[50],
                        }}
                        size="small"
                        className="py-0"
                      />
                    </Box>
                    <Box className="flex space-x-2 my-auto">
                      <Typography
                        variant="h6"
                        className={`${
                          isLive ? 'text-stieglitz' : 'text-white'
                        }`}
                      >
                        RFQ
                      </Typography>
                      <Switch
                        aria-label="rfq-toggle"
                        color="default"
                        onClick={toggleLiveRfq}
                      />
                      <Typography
                        variant="h6"
                        className={`${
                          !isLive ? 'text-stieglitz' : 'text-white'
                        }`}
                      >
                        Trade
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {isLive ? (
                  <LiveOrders />
                ) : (
                  <IndicativeRfqTable filterFulfilled={filterFulfilled} />
                )}
                <Typography variant="h5" className="font-bold">
                  Your Orders
                </Typography>
                <UserDeposits />
              </>
            ) : (
              <>
                <Typography variant="h5" className="font-bold">
                  Trade History
                </Typography>
                <TradeHistory />
              </>
            )}
          </Box>
          <Box className="flex flex-col col-span-2 space-y-4">
            <Box className="flex justify-between">
              <Typography variant="h5" className="font-bold">
                {isLive ? 'Trade' : 'Create RFQ'}
              </Typography>
              <Typography
                variant="h6"
                className={`py-0 px-3 rounded-r-2xl rounded-l-2xl border ${
                  isLive
                    ? 'text-down-bad bg-down-bad/[0.3] border-down-bad'
                    : 'text-primary bg-primary/[0.3] border-primary'
                }`}
              >
                {isLive ? 'Trade' : 'RFQ'}
              </Typography>
            </Box>
            <RfqForm isLive={isLive} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default OTC;
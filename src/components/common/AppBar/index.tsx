import {
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
  MouseEvent,
  Key,
} from 'react';
import cx from 'classnames';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import ClaimRdpxDialog from './ClaimRdpxDialog';
import NetworkButton from './NetworkButton';
import Typography from 'components/UI/Typography';
import WalletDialog from 'components/common/AppBar/WalletDialog';
import CustomButton from 'components/UI/CustomButton';
import PriceCarousel from 'components/common/AppBar/PriceCarousel';

import { AssetsContext } from 'contexts/Assets';
import { WalletContext } from 'contexts/Wallet';

import { CURRENCIES_MAP } from 'constants/index';

import formatAmount from 'utils/general/formatAmount';
import displayAddress from 'utils/general/displayAddress';
import getUserReadableAmount from 'utils/contracts/getUserReadableAmount';

import styles from './styles.module.scss';

const AppLink = ({
  name,
  to,
  active,
  className,
}: {
  name: string;
  to: string;
  active?: boolean;
  className?: string;
}) => {
  const linkClassName = cx(
    'hover:no-underline hover:text-white capitalize cursor-pointer',
    active ? 'text-white' : 'text-stieglitz'
  );
  if (to.startsWith('http')) {
    return (
      <a
        href={to}
        className={cx(className, linkClassName)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {name}
      </a>
    );
  } else {
    return (
      <Link href={to} passHref>
        <Box className={linkClassName}>{name}</Box>
      </Link>
    );
  }
};

const appLinks = {
  1: [
    { name: 'farms', to: '/farms' },
    { name: 'sale', to: '/sale' },
  ],
  56: [{ name: 'SSOV', to: '/ssov' }],
  1337: [
    { name: 'options', to: '/' },
    { name: 'pools', to: '/pools' },
    { name: 'portfolio', to: '/portfolio' },
    { name: 'faucet', to: '/faucet' },
  ],
  421611: [
    // { name: 'options', to: '/' },
    // { name: 'pools', to: '/pools' },
    // { name: 'portfolio', to: '/portfolio' },
    // { name: 'faucet', to: '/faucet' },
    // { name: 'swap', to: '/swap' },
    // { name: 'SSOV', to: '/ssov' },
    { name: 'OTC', to: '/' },
  ],
  42161: [
    { name: 'farms', to: '/farms' },
    { name: 'SSOV', to: '/ssov' },
    { name: 'OTC', to: '/otc' },
  ],
  43114: [{ name: 'SSOV', to: '/ssov' }],
  1088: [{ name: 'SSOV', to: '/ssov' }],
};

const menuLinks = [
  { name: 'Home', to: 'https://dopex.io' },
  { name: 'Docs', to: 'https://docs.dopex.io/' },
  { name: 'Discord', to: 'https://discord.gg/dopex' },
  { name: 'Github', to: 'https://github.com/dopex-io' },
  { name: 'Price Oracles', to: '/oracles' },
  { name: 'Diamond Pepe NFTs', to: '/nfts/diamondpepes' },
  { name: 'Dopex NFTs', to: '/nfts' },
  { name: 'Community NFTs', to: '/nfts/community' },
  { name: 'Tzwap', to: '/tzwap' },
];

interface AppBarProps {
  active?:
    | 'options'
    | 'pools'
    | 'rewards'
    | 'farms'
    | 'volume pool'
    | 'portfolio'
    | 'token sale'
    | 'faucet'
    | 'SSOV'
    | 'leaderboard'
    | 'swap'
    | 'OTC'
    | 'vaults';
}

export default function AppBar(props: AppBarProps) {
  const { active } = props;
  const { accountAddress, connect, wrongNetwork, chainId, ensName, ensAvatar } =
    useContext(WalletContext);
  const { tokenPrices, userAssetBalances } = useContext(AssetsContext);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorElSmall, setAnchorElSmall] = useState<null | HTMLElement>(null);
  const [walletDialog, setWalletDialog] = useState(false);
  const [claimRdpxDialog, setClaimRdpxDialog] = useState(false);
  // TODO: FIX
  // @ts-ignore
  const links = appLinks[chainId];

  const handleRdpxDialogClose = () => setClaimRdpxDialog(false);

  const handleClose = useCallback(() => setAnchorEl(null), []);
  const handleCloseSmall = useCallback(() => setAnchorElSmall(null), []);

  const handleWalletConnect = useCallback(() => {
    connect && connect();
  }, [connect]);

  const handleWalletDialogClose = useCallback(() => {
    setWalletDialog(false);
  }, []);

  const handleClickMenu = useCallback(
    (event: MouseEvent<HTMLButtonElement, MouseEvent>) =>
      setAnchorEl(event.currentTarget),
    []
  );

  const handleClickMenuSmall = useCallback(
    (event: MouseEvent<HTMLButtonElement, MouseEvent>) =>
      setAnchorElSmall(event.currentTarget),
    []
  );

  const handleClick = useCallback(() => {
    setWalletDialog(true);
  }, []);

  const walletButtonContent = useMemo(() => {
    if (wrongNetwork) return 'Wrong Network';
    if (accountAddress) return displayAddress(accountAddress, ensName);
    return '';
  }, [accountAddress, ensName, wrongNetwork]);

  const handleClaimRdpx = () => {
    setClaimRdpxDialog(true);
  };

  const menuItems = useMemo(() => {
    return [
      ...menuLinks,
      chainId === 1 && {
        name: 'Claim',
        children: (
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleClaimRdpx}
          >
            Claim rDPX
          </Button>
        ),
      },
    ].filter((i) => i);
  }, [chainId]);

  return (
    <>
      <ClaimRdpxDialog
        open={claimRdpxDialog}
        handleClose={handleRdpxDialogClose}
      />
      <WalletDialog
        open={walletDialog}
        userBalances={userAssetBalances}
        handleClose={handleWalletDialogClose}
      />
      <nav
        className={cx(
          'fixed top-0 w-full text-gray-600 z-50',
          styles['appBar']
        )}
      >
        <PriceCarousel tokenPrices={tokenPrices} />
        <Box className="flex w-full items-center container pl-5 pr-5 lg:pl-10 lg:pr-10 p-4 justify-between mx-auto max-w-full">
          <Box className="flex items-center">
            <a
              className="flex items-center mr-10 cursor-pointer hover:no-underline"
              href="/"
            >
              <img
                src="/images/brand/logo.svg"
                className="w-9 text-left"
                alt="logo"
              />
            </a>
            <Box className="space-x-10 mr-10 hidden lg:flex">
              {links.map(
                (link: { name: Key | null | undefined; to: string }) => {
                  if (link.name === active)
                    return (
                      <AppLink
                        to={link.to}
                        // TODO: FIX
                        // @ts-ignore
                        name={link.name}
                        key={link.name}
                        active
                      />
                    );
                  return (
                    // TODO: FIX
                    // @ts-ignore
                    <AppLink to={link.to} name={link.name} key={link.name} />
                  );
                }
              )}
            </Box>
          </Box>
          <Box className="flex items-center">
            {accountAddress ? (
              <Box className="bg-cod-gray flex flex-row rounded-md items-center">
                <Button
                  variant="text"
                  className="text-white border-cod-gray hover:border-wave-blue border border-solid"
                  onClick={handleClick}
                >
                  {ensAvatar && (
                    <img
                      src={ensAvatar}
                      className="w-5 mr-2"
                      alt="ens avatar"
                    />
                  )}
                  {walletButtonContent}
                </Button>
                <Box className="bg-mineshaft flex-row px-2 py-2 rounded-md items-center mr-1 hidden lg:flex">
                  <Typography variant="caption" component="div">
                    {formatAmount(
                      getUserReadableAmount(
                        // TODO: FIX
                        // @ts-ignore
                        userAssetBalances[CURRENCIES_MAP[chainId]],
                        18
                      ),
                      3
                    )}{' '}
                    <span className="text-stieglitz">
                      {CURRENCIES_MAP[String(chainId)]
                        ? CURRENCIES_MAP[String(chainId)]
                        : 'ETH'}
                    </span>
                  </Typography>
                </Box>
              </Box>
            ) : (
              <CustomButton size="medium" onClick={handleWalletConnect}>
                Connect Wallet
              </CustomButton>
            )}
            <NetworkButton className="lg:inline-flex hidden ml-2 w-28" />
            <Box>
              {/* TODO: FIX */}
              {/* @ts-ignore */}
              <IconButton
                aria-label="more"
                aria-controls="long-menu"
                aria-haspopup="true"
                onClick={handleClickMenu}
                style={{ height: 38 }}
                className="w-9 long-menu ml-2 rounded-md bg-umbra hover:bg-umbra hover:opacity-80 hidden lg:flex"
                size="large"
              >
                <MoreVertIcon className={cx('', styles['vertIcon'])} />
              </IconButton>
            </Box>
            <Box>
              {/* TODO: FIX */}
              {/* @ts-ignore */}
              <IconButton
                onClick={handleClickMenuSmall}
                className="lg:hidden"
                size="large"
              >
                <MenuIcon className="text-white" />
              </IconButton>
            </Box>
            <Box className="flex flex-row">
              <Menu
                anchorEl={anchorElSmall}
                open={Boolean(anchorElSmall)}
                onClose={handleCloseSmall}
                classes={{ paper: 'bg-cod-gray' }}
              >
                <Typography variant="h5" className="font-bold ml-4 my-2">
                  App
                </Typography>
                {/* TODO: FIX */}
                {/* @ts-ignore */}
                {links.map((link) => {
                  return (
                    <MenuItem
                      onClick={handleCloseSmall}
                      className="ml-2 text-white"
                      key={link.name}
                    >
                      <AppLink to={link.to} name={link.name} />
                    </MenuItem>
                  );
                })}
                <Box>
                  <Typography variant="h5" className="font-bold ml-4 my-2">
                    Links
                  </Typography>
                  {menuItems.map(
                    // TODO: FIX
                    // @ts-ignore
                    (item: {
                      name: string;
                      to: string;
                      children: ReactNode;
                    }) => {
                      if (item.children) {
                        return (
                          <MenuItem
                            onClick={handleClose}
                            className="ml-2"
                            key={item.name}
                          >
                            {item.children}
                          </MenuItem>
                        );
                      }
                      return (
                        <MenuItem
                          onClick={handleClose}
                          className="ml-2 text-white"
                          key={item.name}
                        >
                          <AppLink to={item.to} name={item.name} />
                        </MenuItem>
                      );
                    }
                  )}
                </Box>
                <Box className="border border-stieglitz" />
                <NetworkButton className="mx-3" />
              </Menu>
            </Box>
            <Box className="flex flex-row">
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                classes={{ paper: 'bg-cod-gray' }}
              >
                {menuItems.map(
                  // TODO: FIX
                  // @ts-ignore
                  (item: { name: string; to: string; children: ReactNode }) => {
                    if (item.children) {
                      return (
                        <MenuItem
                          onClick={handleClose}
                          className="ml-2"
                          key={item.name}
                        >
                          {item.children}
                        </MenuItem>
                      );
                    }
                    return (
                      <MenuItem
                        onClick={handleClose}
                        className="ml-2 text-white"
                        key={item.name}
                      >
                        <AppLink to={item.to} name={item.name} />
                      </MenuItem>
                    );
                  }
                )}
              </Menu>
            </Box>
          </Box>
        </Box>
      </nav>
    </>
  );
}
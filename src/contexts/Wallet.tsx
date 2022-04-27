import { createContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ethers, Signer } from 'ethers';
import { providers } from '@0xsequence/multicall';
import { Addresses } from '@dopex-io/sdk';
import Web3Modal from 'web3modal';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import WalletConnectProvider from '@walletconnect/web3-provider';

import { INFURA_PROJECT_ID, ANKR_KEY } from 'constants/env';

interface WalletContextInterface {
  accountAddress?: string;
  ensName?: string;
  ensAvatar?: string;
  contractAddresses?: { [key: string]: any };
  provider?: ethers.providers.Provider;
  signer?: Signer;
  wrongNetwork?: boolean;
  connect?: Function;
  disconnect?: Function;
  changeWallet?: Function;
  chainId?: number;
  blockTime?: number;
  epochInitTime?: number;
  supportedChainIds?: number[];
  changeNetwork?: 'user' | 'wrong-network' | 'close';
  setChangeNetwork?: Function;
}

export const WalletContext = createContext<WalletContextInterface>({});

export const CHAIN_ID_TO_PROVIDERS = {
  '1': `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
  '56': `https://rpc.ankr.com/bsc/${ANKR_KEY}`,
  '42161': `https://arbitrum-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
  '43114': `https://rpc.ankr.com/avalanche/${ANKR_KEY}`,
  '421611': `https://arbitrum-rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
  '1088': 'https://andromeda.metis.io/?owner=1088',
  '1337': 'http://127.0.0.1:8545',
};

const PAGE_TO_SUPPORTED_CHAIN_IDS = {
  '/': [1, 42161, 43114, 56],
  '/farms': [1, 42161],
  '/farms/manage': [1, 42161],
  '/vaults': [42161, 56, 43114, 1088],
  '/vaults/DPX': [42161],
  '/vaults/LUNA': [42161],
  '/vaults/WBTC': [42161],
  '/vaults/RDPX': [42161],
  '/vaults/ETH': [42161],
  '/vaults/GOHM': [42161],
  '/vaults/BNB': [56],
  '/vaults/GMX': [42161],
  '/vaults/AVAX': [43114],
  '/vaults/CRV': [42161],
  '/vaults/METIS': [1088],
  '/ssov': [42161, 56, 43114, 1088],
  '/ssov/call/DPX': [42161],
  '/ssov/call/RDPX': [42161],
  '/ssov/call/ETH': [42161],
  '/ssov/call/GOHM': [42161],
  '/ssov/call/BNB': [56],
  '/ssov/call/GMX': [42161],
  '/ssov/call/AVAX': [43114],
  '/ssov/call/METIS': [1088],
  '/ssov/put/RDPX': [42161],
  '/ssov/put/GOHM': [42161],
  '/ssov/put/BTC': [42161],
  '/ssov/put/GMX': [42161],
  '/ssov/put/ETH': [42161],
  '/ssov/put/CRV': [42161],
  '/ssov/v3/call/ETH': [42161],
  '/nfts': [42161],
  '/nfts/community': [42161, 1, 43114],
  '/nfts/diamondpepes': [42161],
  '/nfts/diamondpepes/pledge': [42161],
  '/nfts/diamondpepes/pledge2': [42161],
  '/sale': [1],
  '/oracles': [1, 42161, 56, 43114],
  '/tzwap': [1, 42161],
  '/otc': [42161],
  '/otc/chat/:id': [42161],
};

const DEFAULT_CHAIN_ID =
  Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) ?? 42161;

let web3Modal;

if (typeof window !== 'undefined') {
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: CHAIN_ID_TO_PROVIDERS,
      },
    },
    walletlink: {
      package: CoinbaseWalletSDK,
      options: {
        appName: 'Dopex',
        rpc: CHAIN_ID_TO_PROVIDERS,
      },
    },
    ...(window['clover'] && {
      injected: {
        display: {
          logo: '/wallets/Clover.png',
          name: 'Clover Wallet',
          description: 'Connect to your Clover Wallet',
        },
        package: null,
      },
    }),
    ...(window.ethereum?.isCoin98 && {
      injected: {
        display: {
          logo: '/wallets/Coin98.png',
          name: 'Coin98',
          description: 'Connect to your Coin98 Wallet',
        },
        package: null,
      },
    }),
    ...(window.web3?.currentProvider?.isBitKeep && {
      injected: {
        display: {
          logo: '/wallets/Bitkeep.png',
          name: 'Bitkeep',
          description: 'Connect to your Bitkeep Wallet',
        },
        package: null,
      },
    }),
  };

  web3Modal = new Web3Modal({
    cacheProvider: true,
    theme: 'dark',
    providerOptions,
  });
}

export const WalletProvider = (props) => {
  const location = useLocation();

  const [state, setState] = useState<WalletContextInterface>({
    accountAddress: '',
    wrongNetwork: false,
    chainId: DEFAULT_CHAIN_ID,
    contractAddresses: Addresses[DEFAULT_CHAIN_ID],
    // ethers provider
    provider: null,
    supportedChainIds: [],
  });

  const [ens, setEns] = useState<{
    ensName: string;
    ensAvatar: string;
  }>({ ensName: '', ensAvatar: '' });
  const [blockTime, setBlockTime] = useState(0);
  const [changeNetwork, setChangeNetwork] = useState<
    'user' | 'wrong-network' | 'close'
  >('close');

  useEffect(() => {
    if (!state.provider) return;
    (async function () {
      setBlockTime(Number((await state.provider.getBlock('latest')).timestamp));
    })();
  }, [state.provider]);

  const updateState = useCallback(
    async ({
      web3Provider,
      ethersProvider,
      isUser,
    }: {
      web3Provider: any;
      ethersProvider?: ethers.providers.Provider;
      isUser: boolean;
    }) => {
      const provider =
        !isUser && ethersProvider
          ? ethersProvider
          : new ethers.providers.Web3Provider(web3Provider, 'any');
      const { chainId } = await provider.getNetwork();

      if (
        PAGE_TO_SUPPORTED_CHAIN_IDS[location.pathname] &&
        !PAGE_TO_SUPPORTED_CHAIN_IDS[location.pathname]?.includes(chainId)
      ) {
        setState((prevState) => ({
          ...prevState,
          wrongNetwork: true,
          supportedChainIds: PAGE_TO_SUPPORTED_CHAIN_IDS[location.pathname],
        }));
        return;
      }

      const multicallProvider = new providers.MulticallProvider(
        new ethers.providers.StaticJsonRpcProvider(
          CHAIN_ID_TO_PROVIDERS[chainId]
        )
      );
      let signer: Signer | undefined;
      let address: string | undefined;

      if (isUser) {
        const web3Provider = provider as ethers.providers.Web3Provider;
        signer = await web3Provider.getUncheckedSigner();
        address = await signer.getAddress();
      }

      let contractAddresses: any;

      if (chainId === 1337) {
        contractAddresses = {
          ...require('addresses/core.json'),
          ...require('addresses/farming.json'),
          ...require('addresses/tokensale.json'),
        };
      } else {
        contractAddresses = Addresses[chainId];
      }

      setState((prevState) => ({
        ...prevState,
        wrongNetwork: false,
        provider: multicallProvider,
        chainId,
        contractAddresses,
        supportedChainIds: PAGE_TO_SUPPORTED_CHAIN_IDS[location.pathname],
        ...(isUser && {
          signer,
          accountAddress: address,
        }),
      }));
    },
    [location.pathname]
  );

  const connect = useCallback(() => {
    web3Modal
      .connect()
      .then(async (provider) => {
        provider.on('accountsChanged', async () => {
          await updateState({ web3Provider: provider, isUser: true });
        });

        provider.on('chainChanged', async () => {
          await updateState({ web3Provider: provider, isUser: true });
        });
        await updateState({ web3Provider: provider, isUser: true });
      })
      .catch(() => {
        if (window.location.pathname !== '/') window.location.replace('/');
      });
  }, [updateState]);

  const disconnect = useCallback(() => {
    if (!web3Modal) return;
    web3Modal.clearCachedProvider();
    setState((prevState) => ({
      ...prevState,
      isUser: false,
      accountAddress: '',
      provider: new providers.MulticallProvider(
        new ethers.providers.StaticJsonRpcProvider(
          CHAIN_ID_TO_PROVIDERS[DEFAULT_CHAIN_ID]
        )
      ),
    }));
  }, []);

  const changeWallet = useCallback(() => {
    if (!web3Modal) return;
    web3Modal.clearCachedProvider();
    web3Modal
      .connect()
      .then(async (provider) => {
        await updateState({ web3Provider: provider, isUser: true });
      })
      .catch(async () => {
        await updateState({
          web3Provider: CHAIN_ID_TO_PROVIDERS[state.chainId],
          ethersProvider: new ethers.providers.StaticJsonRpcProvider(
            CHAIN_ID_TO_PROVIDERS[state.chainId]
          ),
          isUser: false,
        });
      });
  }, [updateState, state.chainId]);

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      connect();
    } else {
      updateState({
        web3Provider: CHAIN_ID_TO_PROVIDERS[DEFAULT_CHAIN_ID],
        ethersProvider: new ethers.providers.StaticJsonRpcProvider(
          CHAIN_ID_TO_PROVIDERS[DEFAULT_CHAIN_ID]
        ),
        isUser: false,
      });
    }
  }, [connect, updateState]);

  useEffect(() => {
    (async () => {
      if (state.accountAddress) {
        const mainnetProvider = new ethers.providers.StaticJsonRpcProvider(
          'https://eth-mainnet.gateway.pokt.network/v1/lb/61ceae3bb86d760039e05c85'
        );
        const ensData = { ensName: '', ensAvatar: '' };
        try {
          ensData.ensName =
            (await mainnetProvider.lookupAddress(state.accountAddress)) ?? '';
          if (ensData.ensName !== '') {
            ensData.ensAvatar =
              (await mainnetProvider.getAvatar(ensData.ensName)) ?? '';
          }
        } catch {}
        setEns(ensData);
      }
    })();
  }, [state.accountAddress]);

  const contextValue = {
    connect,
    disconnect,
    changeWallet,
    blockTime,
    changeNetwork,
    setChangeNetwork,
    ...ens,
    ...state,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {props.children}
    </WalletContext.Provider>
  );
};

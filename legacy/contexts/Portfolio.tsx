import {
  createContext,
  useEffect,
  useState,
  useContext,
  useCallback,
} from 'react';
import { providers } from '@0xsequence/multicall';
import {
  ERC20__factory,
  Delegator__factory,
  CALL_REWARD_KEYS,
  Margin__factory,
} from '@dopex-io/sdk';
import { ApolloQueryResult } from '@apollo/client';
import BigNumber from 'bignumber.js';

import { AssetsContext } from '../../src/contexts/Assets';
import { WalletContext } from '../../src/contexts/Wallet';

import { optionPoolsClient } from 'graphql/apollo';

import { OptionData, OptionPoolBrokerTransaction } from 'types';

import {
  GetOptionsContractsDocument,
  GetOptionsContractsQuery,
  GetUserDataQuery,
  GetUserDataDocument,
} from 'graphql/generated/optionPools';
import getOptionsContractId from 'utils/contracts/getOptionsContractId';
import getPositionId from 'utils/contracts/getPositionId';

type AllOptions = {
  [key: string]: OptionData[];
};

type DelegatedOptions = {
  [key: string]: (OptionData & { claimAmount: string })[];
};

type MarginOptions = {
  [key: string]: (OptionData & {
    collateral: string;
    collateralAmount: string;
    leverage: string;
    borrowed: string;
    borrowIndex: string;
  })[];
};

interface PortfolioContextInterface {
  callRewards: any[];
  actionRewards: any[];
  rebateClaimed: any[];
  totalDpxEarnedFromCalls: BigNumber;
  totalDpxEarnedFromActions: BigNumber;
  totalRdpxEarnedFromRebates: BigNumber;
  userTransactions: OptionPoolBrokerTransaction[];
  allOptions: AllOptions;
  delegatedOptions: DelegatedOptions;
  marginOptions: MarginOptions;
  updateAssetBalances?: Function;
  updateOptionBalances?: Function;
}

export const PortfolioContext = createContext<PortfolioContextInterface>({
  callRewards: [],
  actionRewards: [],
  rebateClaimed: [],
  totalDpxEarnedFromCalls: new BigNumber(0),
  totalDpxEarnedFromActions: new BigNumber(0),
  totalRdpxEarnedFromRebates: new BigNumber(0),
  allOptions: {},
  delegatedOptions: {},
  marginOptions: {},
  userTransactions: [],
});

export const PortfolioProvider = (props) => {
  const { provider, accountAddress, contractAddresses } =
    useContext(WalletContext);
  const { baseAssets } = useContext(AssetsContext);

  const [allOptions, setAllOptions] = useState<AllOptions>({});
  const [delegatedOptions, setDelegatedOptions] = useState<DelegatedOptions>(
    {}
  );
  const [marginOptions, setMarginOptions] = useState<MarginOptions>({});
  const [userTransactions, setUserTransactions] = useState<
    OptionPoolBrokerTransaction[]
  >([]);
  const [rewardData, setRewardData] = useState({
    callRewards: [],
    actionRewards: [],
    rebateClaimed: [],
    totalDpxEarnedFromCalls: new BigNumber(0),
    totalDpxEarnedFromActions: new BigNumber(0),
    totalRdpxEarnedFromRebates: new BigNumber(0),
  });

  const updateOptionBalances = useCallback(async () => {
    if (!baseAssets || !contractAddresses || !provider || !accountAddress)
      return;

    const queryResult: ApolloQueryResult<GetOptionsContractsQuery> =
      await optionPoolsClient.query({
        query: GetOptionsContractsDocument,
        variables: { expiry: (new Date().getTime() / 1000 - 86400).toFixed() },
        fetchPolicy: 'no-cache',
      });

    const { data } = queryResult;

    const newAllOptions = {};
    const newDelegatedOptions = {};
    const newMarginOptions: MarginOptions = {};

    await Promise.all(
      data.optionPools.map(async (op) => {
        const asset = Object.keys(contractAddresses).find((key) => {
          if (
            contractAddresses[key].toLowerCase() === op.baseAsset.toLowerCase()
          ) {
            return true;
          }
          return false;
        });

        let optionsData: OptionData[] = op.optionsContracts.map((oc) => {
          const optionsContract = ERC20__factory.connect(
            oc.address,
            new providers.MulticallProvider(provider)
          );

          const optionsContractId = getOptionsContractId(
            oc.isPut,
            oc.expiry,
            oc.strike,
            op.address
          );

          return {
            optionsContract,
            optionsContractId,
            ...oc,
          };
        });

        let delegatedOptionsData = optionsData.map((item) => ({ ...item }));
        let marginOptionsData = optionsData.map((item) => ({ ...item }));

        const balanceCalls = optionsData.map((item) => {
          return item.optionsContract.balanceOf(accountAddress);
        });

        const result = await Promise.all(balanceCalls);

        optionsData = optionsData.map((item, index) => {
          return {
            userBalance: result[index].toString(),
            ...item,
          };
        });

        optionsData = optionsData.filter((item) => {
          if (Number(item.userBalance) === 0) return false;
          return true;
        });

        newAllOptions[asset] = optionsData;
        newDelegatedOptions[asset] = [];
        newMarginOptions[asset] = [];

        if (contractAddresses.Delegator) {
          const delegator = Delegator__factory.connect(
            contractAddresses.Delegator,
            new providers.MulticallProvider(provider)
          );
          const delegatorUserBalanceCalls = delegatedOptionsData.map((item) =>
            delegator.balances(item.optionsContractId, accountAddress)
          );
          const delegatorUserBalances = await Promise.all(
            delegatorUserBalanceCalls
          );

          const delegatorClaimAmountCalls = delegatedOptionsData.map((item) =>
            delegator.claimAmount(item.optionsContractId, accountAddress)
          );
          const delegatorClaimAmounts = await Promise.all(
            delegatorClaimAmountCalls
          );

          delegatedOptionsData = delegatedOptionsData
            .map((item, index) => ({
              ...item,
              userBalance: delegatorUserBalances[index].toString(),
              claimAmount: delegatorClaimAmounts[index].toString(),
            }))
            .filter(
              (item) =>
                Number(item.userBalance) > 0 || Number(item.claimAmount) > 0
            );

          newDelegatedOptions[asset] = delegatedOptionsData;
        }

        if (contractAddresses.Margin) {
          const margin = Margin__factory.connect(
            contractAddresses.Margin,
            provider
          );
          const collaterals = await margin.getCollaterals();
          await Promise.all(
            collaterals.map(async (collateral) => {
              const positionIds = marginOptionsData.map((item) =>
                getPositionId(
                  item.isPut,
                  item.expiry,
                  item.strike,
                  op.address,
                  collateral
                )
              );
              const marginPositions = await Promise.all(
                positionIds.map((positionId) =>
                  margin.marginPositions(accountAddress, positionId)
                )
              );

              const newMarginOptionsData = marginOptionsData
                .map((item, index) => ({
                  ...item,
                  userBalance: marginPositions[index].amount.toString(),
                  collateral: collateral,
                  collateralAmount:
                    marginPositions[index].collateralAmount.toString(),
                  leverage: marginPositions[index].leverage.toString(),
                  borrowed: marginPositions[index].borrowed.toString(),
                  borrowIndex: marginPositions[index].borrowIndex.toString(),
                }))
                .filter((item) => Number(item.userBalance) > 0);

              newMarginOptions[asset] = newMarginOptionsData;
            })
          );
        }
      })
    );

    setAllOptions(newAllOptions);
    setDelegatedOptions(newDelegatedOptions);
    setMarginOptions(newMarginOptions);
  }, [provider, accountAddress, baseAssets, contractAddresses]);

  useEffect(() => {
    updateOptionBalances();
  }, [updateOptionBalances]);

  const updateUserData = useCallback(async () => {
    if (!accountAddress) return;

    let userTxs = [];

    const result: ApolloQueryResult<GetUserDataQuery> =
      await optionPoolsClient.query({
        query: GetUserDataDocument,
        variables: { user: accountAddress.toLowerCase() },
        fetchPolicy: 'no-cache',
      });

    userTxs = userTxs
      .concat(result.data.user?.optionsExercised || [])
      .concat(result.data.user?.optionsPurchased || [])
      .concat(result.data.user?.optionsSwaped || []);

    setRewardData({
      callRewards:
        result.data.user?.callReward.map((item) => {
          return {
            description: CALL_REWARD_KEYS[item.rewardKey],
            amount: new BigNumber(item.amount).dividedBy('1e18'),
            poolEpoch: item.poolEpoch,
          };
        }) || [],
      actionRewards:
        result.data.user?.optionPoolReward.map((item) => {
          return {
            description: 'Adding liquidity to the Option Pool',
            amount: new BigNumber(item.amount).dividedBy('1e18'),
            poolEpoch: item.poolEpoch,
          };
        }) || [],
      rebateClaimed: [],
      totalDpxEarnedFromCalls: new BigNumber(
        result.data.user?.rewards.totalCallRewards || 0
      ),
      totalDpxEarnedFromActions: new BigNumber(
        result.data.user?.rewards.totalOptionPoolRewards || 0
      ),
      totalRdpxEarnedFromRebates: new BigNumber(0),
    });

    setUserTransactions(userTxs);
  }, [accountAddress]);

  useEffect(() => {
    updateUserData();
  }, [updateUserData]);

  let contextValue = {
    ...rewardData,
    delegatedOptions,
    userTransactions,
    updateOptionBalances,
    allOptions,
    marginOptions,
  };

  return (
    <PortfolioContext.Provider value={contextValue}>
      {props.children}
    </PortfolioContext.Provider>
  );
};
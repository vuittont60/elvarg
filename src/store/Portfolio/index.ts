import { StateCreator } from 'zustand';
import format from 'date-fns/format';
import { ApolloQueryResult } from '@apollo/client';
import {
  ERC20__factory,
  SsovV3__factory,
  AtlanticStraddle__factory,
} from '@dopex-io/sdk';

import { AssetsSlice } from 'store/Assets';
import { WalletSlice } from 'store/Wallet';

import {
  GetUserDataDocument,
  GetUserDataQuery,
} from 'graphql/generated/portfolio';
import {
  GetUserStraddlesDataDocument,
  GetUserStraddlesDataQuery,
} from 'graphql/generated/portfolioStraddles';
import {
  portfolioGraphClient,
  portfolioStraddlesGraphClient,
} from 'graphql/apollo';

import getLinkFromVaultName from 'utils/contracts/getLinkFromVaultName';
import getUserReadableAmount from 'utils/contracts/getUserReadableAmount';

export interface UserSSOVPosition {
  amount: string;
  epoch: string;
  strike: string;
  ssovAddress: string;
  ssovName: string;
  assetName: string;
  fee: string;
  premium: string;
  pnl: string;
  isPut: boolean;
  link: string;
  vaultType: string;
  expiry: string;
  owner: string;
}

export interface UserSSOVDeposit {
  amount: string;
  epoch: string;
  ssovAddress: string;
  ssovName: string;
  isPut: boolean;
  assetName: string;
  strike: string;
  link: string;
  vaultType: string;
  owner: string;
}

export interface UserStraddlesPosition {
  vaultName: string;
  assetName: string;
  amount: string;
  epoch: string;
  strikePrice: string;
  underlyingPurchased: string;
  link: string;
  vaultType: string;
  owner: string;
}

export interface UserStraddlesDeposit {
  vaultName: string;
  assetName: string;
  amount: string;
  rollover: boolean;
  epoch: string;
  link: string;
  vaultType: string;
  owner: string;
}

export interface PortfolioData {
  userSSOVPositions: UserSSOVPosition[];
  userSSOVDeposits: UserSSOVDeposit[];
  userStraddlesPositions: UserStraddlesPosition[];
  userStraddlesDeposits: UserStraddlesDeposit[];
  isLoading: boolean;
}

export interface PortfolioSlice {
  portfolioData?: PortfolioData;
  updatePortfolioData?: Function;
}

const initialPortfolioData = {
  userSSOVPositions: [],
  userSSOVDeposits: [],
  userStraddlesPositions: [],
  userStraddlesDeposits: [],
  isLoading: true,
};

export const createPortfolioSlice: StateCreator<
  PortfolioSlice & AssetsSlice & WalletSlice,
  [['zustand/devtools', never]],
  [],
  PortfolioSlice
> = (set, get) => ({
  portfolioData: initialPortfolioData,
  updatePortfolioData: async () => {
    const { accountAddress, provider } = get();

    if (!accountAddress || !provider) return;

    const getUserSSOVDeposit = async (userDeposit: any) => {
      const ssov = SsovV3__factory.connect(userDeposit.ssov.id, provider);
      const ssovName = await ssov.name();
      const isPut = await ssov.isPut();
      const assetName = await ssov.underlyingSymbol();

      const tokenId = userDeposit.id.split('#')[1];

      try {
        // if not exists then it has been withdrawn
        const owner = await ssov.ownerOf(tokenId);

        return {
          epoch: userDeposit.epoch,
          strike: userDeposit.strike,
          amount: userDeposit.amount,
          ssovAddress: userDeposit.ssov.id,
          assetName: assetName,
          isPut: isPut,
          ssovName: ssovName,
          link: getLinkFromVaultName(ssovName) + '?epoch=' + userDeposit.epoch,
          vaultType: 'SSOV',
          owner: owner,
        };
      } catch (err) {
        console.log(err);
        return;
      }
    };

    const getUserSSOVPosition = async (userPosition: any) => {
      const ssovAddress = userPosition.ssov.id;

      try {
        const ssov = SsovV3__factory.connect(ssovAddress, provider);
        const ssovName = await ssov.name();

        const epochStrikeData = await ssov.getEpochStrikeData(
          userPosition.epoch,
          userPosition.strike
        );

        const token = ERC20__factory.connect(epochStrikeData[0], provider);

        const balance = await token.balanceOf(accountAddress!);

        if (balance.eq(0)) return;

        const isPut = await ssov.isPut();
        const assetName = await ssov.underlyingSymbol();

        const currentEpoch = String(await ssov.currentEpoch());

        const epoch = userPosition.epoch;

        const epochData = await ssov.getEpochData(epoch);

        let settlementPrice = epochData['settlementPrice'];

        if (settlementPrice.eq(0))
          settlementPrice = await ssov.getUnderlyingPrice();

        const strike = userPosition.strike;

        const amount = userPosition.amount;

        const pnl = !isPut
          ? (getUserReadableAmount(settlementPrice, 8) -
              getUserReadableAmount(strike, 8)) *
            getUserReadableAmount(amount, 18)
          : (getUserReadableAmount(strike, 8) -
              getUserReadableAmount(settlementPrice, 8)) *
            getUserReadableAmount(amount, 18);

        if (pnl <= 0 && currentEpoch != epoch) return;

        return {
          epoch: userPosition.epoch,
          strike: strike,
          amount: amount,
          fee: userPosition.fee,
          premium: userPosition.premium,
          pnl: String(pnl),
          ssovAddress: ssovAddress,
          assetName: assetName,
          isPut: isPut,
          ssovName: ssovName,
          link: getLinkFromVaultName(ssovName) + '?epoch=' + userPosition.epoch,
          vaultType: 'SSOV',
          expiry: format(
            new Date(Number(epochData.expiry) * 1000),
            'd LLL yyyy'
          ).toLocaleUpperCase(),
          owner: accountAddress!,
        };
      } catch (err) {
        console.log(err);
        return;
      }
    };

    const getUserStraddlesPosition = async (userPosition: any) => {
      const id = userPosition.id;
      const vaultAddress = id.split('#')[0];
      // const tokenId = id.split('#')[1];

      const vault = AtlanticStraddle__factory.connect(vaultAddress, provider);
      const vaultName = await vault.symbol();
      const epoch = userPosition.epoch;
      const assetName = vaultName.split('-')[0]!;
      const isEpochExpired = await vault.isEpochExpired(epoch);

      try {
        if (!isEpochExpired)
          return {
            assetName: assetName,
            vaultName: vaultName,
            amount: String(userPosition.amount / 2),
            epoch: epoch,
            strikePrice: userPosition.strikePrice,
            underlyingPurchased: userPosition.underlyingPurchased,
            link: '/straddles/' + assetName.toUpperCase() + '?epoch=' + epoch,
            vaultType: 'straddles',
            owner: accountAddress!,
          };
        return;
      } catch (err) {
        console.log(err);
        return;
      }
    };

    const getUserStraddlesDeposit = async (userDeposit: any) => {
      const id = userDeposit.id;
      const vaultAddress = id.split('#')[0];
      // const tokenId = id.split('#')[1];

      const vault = AtlanticStraddle__factory.connect(vaultAddress, provider);
      const vaultName = await vault.symbol();
      const assetName = vaultName.split('-')[0]!;

      try {
        return {
          assetName: 'USDC',
          vaultName: vaultName,
          amount: userDeposit.amount,
          epoch: userDeposit.epoch,
          rollover: userDeposit.rollover,
          link:
            '/straddles/' +
            assetName.toUpperCase() +
            '?epoch=' +
            userDeposit.epoch,
          vaultType: 'straddles',
          owner: accountAddress!,
        };
      } catch (err) {
        console.log(err);
        return;
      }
    };

    const ssovQueryResult: ApolloQueryResult<GetUserDataQuery> =
      await portfolioGraphClient.query({
        query: GetUserDataDocument,
        variables: { user: accountAddress.toLowerCase() },
        fetchPolicy: 'no-cache',
      });

    const data: any = ssovQueryResult['data']['users'][0];

    const ssovDepositsPromises = [];
    const ssovDeposits: UserSSOVDeposit[] = [];
    const ssovPositionsPromises = [];
    const ssovPositions: UserSSOVPosition[] = [];

    for (let i in data?.userSSOVDeposit) {
      ssovDepositsPromises.push(getUserSSOVDeposit(data?.userSSOVDeposit[i]));
    }

    const ssovDepositsResponses = await Promise.all(ssovDepositsPromises);

    for (let i in ssovDepositsResponses) {
      if (ssovDepositsResponses[i])
        ssovDeposits.push(ssovDepositsResponses[i]!);
    }

    for (let i in data?.userSSOVOptionBalance) {
      ssovPositionsPromises.push(
        getUserSSOVPosition(data?.userSSOVOptionBalance[i])
      );
    }

    const ssovPositionsResponses = await Promise.all(ssovPositionsPromises);

    for (let i in ssovPositionsResponses) {
      if (ssovPositionsResponses[i])
        ssovPositions.push(ssovPositionsResponses[i]!);
    }

    // Straddles

    const straddlesQueryResult: ApolloQueryResult<GetUserStraddlesDataQuery> =
      await portfolioStraddlesGraphClient.query({
        query: GetUserStraddlesDataDocument,
        variables: { user: accountAddress.toLowerCase() },
        fetchPolicy: 'no-cache',
      });

    const straddlesData: any = straddlesQueryResult['data']['users'][0];

    const straddlesDepositsPromises = [];
    const straddlesPositionsPromises = [];

    const straddlesDeposits: UserStraddlesDeposit[] = [];
    const straddlesPositions: UserStraddlesPosition[] = [];

    for (let i in straddlesData?.userOpenStraddles) {
      straddlesPositionsPromises.push(
        getUserStraddlesPosition(straddlesData?.userOpenStraddles[i])
      );
    }

    const straddlePositionsResponses = await Promise.all(
      straddlesPositionsPromises
    );

    for (let i in straddlePositionsResponses) {
      if (straddlePositionsResponses[i])
        straddlesPositions.push(straddlePositionsResponses[i]!);
    }

    for (let i in straddlesData?.userOpenDeposits) {
      straddlesDepositsPromises.push(
        getUserStraddlesDeposit(straddlesData?.userOpenDeposits[i])
      );
    }

    const straddleDepositsResponses = await Promise.all(
      straddlesDepositsPromises
    );

    for (let i in straddleDepositsResponses) {
      if (straddleDepositsResponses[i])
        straddlesDeposits.push(straddleDepositsResponses[i]!);
    }

    set((prevState) => ({
      ...prevState,
      portfolioData: {
        userSSOVDeposits: ssovDeposits,
        userSSOVPositions: ssovPositions,
        userStraddlesDeposits: straddlesDeposits,
        userStraddlesPositions: straddlesPositions,
        isLoading: false,
      },
    }));
  },
});
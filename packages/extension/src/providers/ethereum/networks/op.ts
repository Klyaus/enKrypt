import icon from './icons/op.webp';
import { CoingeckoPlatform, NetworkNames } from '@enkryptcom/types';
import { EvmNetwork, EvmNetworkOptions } from '../types/evm-network';
import { EtherscanActivity } from '../libs/activity-handlers';
import wrapActivityHandler from '@/libs/activity-state/wrap-activity-handler';
import assetsInfoHandler from '@/providers/ethereum/libs/assets-handlers/assetinfo-mew';
import NFTHandler from '@/libs/nft-handlers/goldrush';

const opOptions: EvmNetworkOptions = {
  name: NetworkNames.Optimism,
  name_long: 'Optimism',
  homePage: 'https://www.optimism.io/',
  blockExplorerTX: 'https://optimistic.etherscan.io/tx/[[txHash]]',
  blockExplorerAddr: 'https://optimistic.etherscan.io/address/[[address]]',
  chainID: '0xa',
  isTestNetwork: false,
  currencyName: 'ETH',
  currencyNameLong: 'Ethereum',
  node: 'wss://nodes.mewapi.io/ws/op',
  icon,
  coingeckoID: 'ethereum',
  coingeckoPlatform: CoingeckoPlatform.Optimism,
  assetsInfoHandler,
  NFTHandler,
  activityHandler: wrapActivityHandler(EtherscanActivity),
};

const op = new EvmNetwork(opOptions);

export default op;

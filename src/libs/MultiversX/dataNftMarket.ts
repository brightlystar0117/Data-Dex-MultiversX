import { useToast } from "@chakra-ui/react";
import {
  AbiRegistry,
  SmartContract,
  Address,
  ResultsParser,
  BigUIntValue,
  Transaction,
  ContractFunction,
  U64Value,
  TokenIdentifierValue,
  AddressValue,
  StringValue,
  U32Value,
  AddressType,
  OptionalValue,
  BooleanValue,
  ContractCallPayloadBuilder,
} from "@multiversx/sdk-core/out";
import { sendTransactions } from "@multiversx/sdk-dapp/services";
import { refreshAccount } from "@multiversx/sdk-dapp/utils/account";
import BigNumber from "bignumber.js";
import { uxConfig } from "libs/config";
import { labels } from "libs/language";
import jsonData from "./ABIs/data_market.abi.json";
import { getNetworkProvider } from "./api";
import { MarketplaceRequirementsType, OfferType } from "./types";
import { contractsForChain } from "../config";

export class DataNftMarketContract {
  timeout: number;
  dataNftMarketContractAddress: any;
  chainID: string;
  contract: SmartContract;
  itheumToken: string;

  toast = useToast();

  constructor(chainID: string) {
    this.timeout = uxConfig.mxAPITimeoutMs;
    this.dataNftMarketContractAddress = contractsForChain(chainID).market;
    this.chainID = chainID;

    const json = JSON.parse(JSON.stringify(jsonData));
    const abiRegistry = AbiRegistry.create(json);

    this.contract = new SmartContract({
      address: new Address(this.dataNftMarketContractAddress),
      abi: abiRegistry,
    });

    this.itheumToken = contractsForChain(chainID).itheumToken as unknown as string;
  }

  async viewNumberOfOffers() {
    const interaction = this.contract.methods.viewNumberOfOffers([]);
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();

      const { firstValue, returnCode } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (returnCode && returnCode.isSuccess()) {
        const firstValueAsStruct = firstValue as U32Value;
        return firstValueAsStruct.valueOf().toNumber();
      } else {
        const nonOKErr = new Error("viewNumberOfOffers returnCode returned a non OK value");
        console.error(nonOKErr);

        return 0;
      }
    } catch (error) {
      console.error(error);

      return 0;
    }
  }

  async sendAcceptOfferEsdtTransaction(
    index: number,
    paymentAmount: string,
    tokenId: string,
    amount: number,
    sender: string,
    callbackRoute?: string,
    showCustomMintMsg?: boolean
  ) {
    const data =
      new BigNumber(paymentAmount).comparedTo(0) > 0
        ? new ContractCallPayloadBuilder()
            .setFunction(new ContractFunction("ESDTTransfer"))
            .addArg(new TokenIdentifierValue(tokenId))
            .addArg(new BigUIntValue(paymentAmount))
            .addArg(new StringValue("acceptOffer"))
            .addArg(new U64Value(index))
            .addArg(new BigUIntValue(amount))
            .build()
        : new ContractCallPayloadBuilder()
            .setFunction(new ContractFunction("acceptOffer"))
            .addArg(new U64Value(index))
            .addArg(new BigUIntValue(amount))
            .build();

    const offerEsdtTx = new Transaction({
      value: 0,
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      sender: new Address(sender),
      gasLimit: 20000000,
      chainID: this.chainID,
    });

    await refreshAccount();

    const actionMsg = showCustomMintMsg ? "Minting Data NFT" : "Accepting offer";

    const { sessionId, error } = await sendTransactions({
      transactions: offerEsdtTx,
      transactionsDisplayInfo: {
        processingMessage: actionMsg,
        errorMessage: `${actionMsg} failed :(`,
        successMessage: `${actionMsg} successful!`,
      },
      redirectAfterSign: callbackRoute ? true : false,
      callbackRoute: callbackRoute ?? window.location.pathname,
    });

    return { sessionId, error };
  }

  async sendAcceptOfferNftEsdtTransaction(
    index: number,
    paymentAmount: string,
    tokenId: string,
    nonce: number,
    amount: number,
    senderAddress: string,
    callbackRoute?: string,
    showCustomMintMsg?: boolean
  ) {
    const offerEsdtTx = new Transaction({
      value: 0,
      data: new ContractCallPayloadBuilder()
        .setFunction(new ContractFunction("ESDTNFTTransfer"))
        .addArg(new TokenIdentifierValue(tokenId))
        .addArg(new U64Value(nonce))
        .addArg(new BigUIntValue(paymentAmount))
        .addArg(new AddressValue(new Address(this.dataNftMarketContractAddress)))
        .addArg(new StringValue("acceptOffer"))
        .addArg(new U64Value(index))
        .addArg(new BigUIntValue(amount))
        .build(),
      receiver: new Address(senderAddress),
      sender: new Address(senderAddress),
      gasLimit: 20000000,
      chainID: this.chainID,
    });

    await refreshAccount();

    const actionMsg = showCustomMintMsg ? "Minting Data NFT" : "Accepting offer";

    const { sessionId, error } = await sendTransactions({
      transactions: offerEsdtTx,
      transactionsDisplayInfo: {
        processingMessage: actionMsg,
        errorMessage: `${actionMsg} failed :(`,
        successMessage: `${actionMsg} successful!`,
      },
      redirectAfterSign: callbackRoute ? true : false,
      callbackRoute: callbackRoute ?? window.location.pathname,
    });

    return { sessionId, error };
  }

  async sendAcceptOfferEgldTransaction(index: number, paymentAmount: string, amount: number, senderAddress: string, showCustomMintMsg?: boolean) {
    const offerEgldTx = new Transaction({
      value: paymentAmount,
      data: new ContractCallPayloadBuilder()
        .setFunction(new ContractFunction("acceptOffer"))
        .addArg(new U64Value(index))
        .addArg(new BigUIntValue(amount))
        .build(),
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 20000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const actionMsg = showCustomMintMsg ? "Minting Data NFT" : "Accepting Offer";

    const { sessionId, error } = await sendTransactions({
      transactions: offerEgldTx,
      transactionsDisplayInfo: {
        processingMessage: actionMsg,
        errorMessage: `${actionMsg} failed :(`,
        successMessage: `${actionMsg} successful!`,
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async sendCancelOfferTransaction(index: number, senderAddress: string) {
    const cancelTx = new Transaction({
      value: 0,
      data: new ContractCallPayloadBuilder()
        .setFunction(new ContractFunction("cancelOffer"))
        .addArg(new U64Value(index))
        .addArg(new BooleanValue(true))
        .build(),
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 20000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: cancelTx,
      transactionsDisplayInfo: {
        processingMessage: "Cancelling offer",
        errorMessage: "Cancelling offer failed :(",
        successMessage: "Offer cancelled successfully",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async addToMarket(addTokenCollection: string, addTokenNonce: number, addTokenQuantity: number, price: number, addressOfSender: string) {
    const addERewTx = new Transaction({
      value: 0,
      data: new ContractCallPayloadBuilder()
        .setFunction(new ContractFunction("ESDTNFTTransfer")) //method
        .addArg(new TokenIdentifierValue(addTokenCollection)) //what token id to send
        .addArg(new U64Value(addTokenNonce)) //what token nonce to send
        .addArg(new BigUIntValue(addTokenQuantity)) //how many tokens to send
        .addArg(new AddressValue(new Address(this.dataNftMarketContractAddress))) //address to send to
        .addArg(new StringValue("addOffer")) //what method to call on the contract
        .addArg(new TokenIdentifierValue(this.itheumToken)) //what token id to ask for
        .addArg(new U64Value(0)) //what nonce to ask for
        .addArg(new BigUIntValue(price * 10 ** 18)) //how much to ask for
        .addArg(new BigUIntValue(0)) // minimum amount for seller - setting will be introduced in the future
        .addArg(new BigUIntValue(addTokenQuantity)) //how many times to divide the amount of tokens sent into
        .build(),
      receiver: new Address(addressOfSender),
      sender: new Address(addressOfSender),
      gasLimit: 20000000,
      chainID: this.chainID,
    });
    await refreshAccount();
    const { sessionId, error } = await sendTransactions({
      transactions: addERewTx,
      transactionsDisplayInfo: {
        processingMessage: "Adding Data NFT to marketplace",
        errorMessage: "Adding Data NFT to marketplace failed :(",
        successMessage: "Data NFT added to marketplace",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async delistDataNft(index: number, delistAmount: number, senderAddress: string) {
    const data = new ContractCallPayloadBuilder()
      .setFunction(new ContractFunction("cancelOffer"))
      .addArg(new U64Value(index))
      .addArg(new BigUIntValue(delistAmount))
      .addArg(new BooleanValue(true))
      .build();

    const tx = new Transaction({
      value: "0",
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 20000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: "De-listing offer",
        errorMessage: "De-listing offer failed :(",
        successMessage: "Offer de-listed successfully",
      },
      redirectAfterSign: false,
      sessionInformation: "delist-tx",
    });

    return { sessionId, error };
  }

  async viewRequirements(): Promise<MarketplaceRequirementsType | undefined> {
    const interaction = this.contract.methodsExplicit.viewRequirements();
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return undefined;
      }

      const value = firstValue.valueOf();
      const decoded = {
        accepted_tokens: value.accepted_tokens.map((v: any) => v.toString()),
        accepted_payments: value.accepted_payments.map((v: any) => v.toString()),
        maximum_payment_fees: value.maximum_payment_fees.map((v: any) => v.toFixed()),
        discount_fee_percentage_buyer: value.discount_fee_percentage_buyer.toNumber(),
        discount_fee_percentage_seller: value.discount_fee_percentage_seller.toNumber(),
        percentage_cut_from_buyer: value.percentage_cut_from_buyer.toNumber(),
        percentage_cut_from_seller: value.percentage_cut_from_seller.toNumber(),
        buyer_fee: 0,
        seller_fee: 0,
      };
      decoded.buyer_fee = decoded.percentage_cut_from_buyer - decoded.discount_fee_percentage_buyer;
      decoded.seller_fee = decoded.percentage_cut_from_seller - decoded.discount_fee_percentage_seller;

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_REQ_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return undefined;
    }
  }

  async viewOffers(startIndex: number, stopIndex: number): Promise<OfferType[]> {
    // this will spread out a new array from startIndex to stopIndex e.g. startIndex=0, stopIndex=5 : you get [1,2,3,4,5]
    const indexRange = Array.from({ length: stopIndex - startIndex }, (_, i) => new U64Value(startIndex + 1 + i));

    const interaction = this.contract.methodsExplicit.viewOffers(indexRange);
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return [];
      }

      const values = firstValue.valueOf();
      const decoded = values.map((value: any) => ({
        index: value.offer_id.toNumber(),
        owner: value.owner.toString(),
        offered_token_identifier: value.offered_token_identifier.toString(),
        offered_token_nonce: value.offered_token_nonce.toNumber(),
        offered_token_amount: value.offered_token_amount.toFixed(),
        wanted_token_identifier: value.wanted_token_identifier.toString(),
        wanted_token_nonce: value.wanted_token_nonce.toNumber(),
        wanted_token_amount: value.wanted_token_amount.toFixed(),
        quantity: value.quantity.toNumber(),
      }));

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_OFFERS_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return [];
    }
  }

  async viewPagedOffers(startIndex: number, stopIndex: number, userAddress?: string): Promise<OfferType[]> {
    const interaction = this.contract.methodsExplicit.viewPagedOffers([
      new U64Value(startIndex),
      new U64Value(stopIndex),
      userAddress ? new OptionalValue(new AddressType(), new AddressValue(new Address(userAddress))) : OptionalValue.newMissing(),
    ]);
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return [];
      }

      const values = firstValue.valueOf();
      const decoded = values.map((value: any) => ({
        index: value.offer_id.toNumber(),
        owner: value.owner.toString(),
        offered_token_identifier: value.offered_token_identifier.toString(),
        offered_token_nonce: value.offered_token_nonce.toNumber(),
        offered_token_amount: value.offered_token_amount.toFixed(),
        wanted_token_identifier: value.wanted_token_identifier.toString(),
        wanted_token_nonce: value.wanted_token_nonce.toNumber(),
        wanted_token_amount: value.wanted_token_amount.toFixed(),
        quantity: value.quantity.toNumber(),
      }));

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_OFFERS_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return [];
    }
  }

  async viewOffer(index: number): Promise<OfferType | undefined> {
    const interaction = this.contract.methodsExplicit.viewOffer([new U64Value(index)]);
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return undefined;
      }

      const value = firstValue.valueOf();
      const decoded = {
        index: value.offer_id.toNumber(),
        owner: value.owner.toString(),
        offered_token_identifier: value.offered_token_identifier.toString(),
        offered_token_nonce: value.offered_token_nonce.toNumber(),
        offered_token_amount: value.offered_token_amount.toFixed(),
        wanted_token_identifier: value.wanted_token_identifier.toString(),
        wanted_token_nonce: value.wanted_token_nonce.toNumber(),
        wanted_token_amount: value.wanted_token_amount.toFixed(),
        quantity: value.quantity.toNumber(),
      };

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_OFFERS_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return undefined;
    }
  }

  async viewUserTotalOffers(userAddress: string): Promise<number> {
    const interaction = this.contract.methodsExplicit.viewUserTotalOffers([new AddressValue(new Address(userAddress))]);
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return 0;
      }

      const value = firstValue.valueOf();
      const decoded = value.toNumber();

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_OFFERS_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return 0;
    }
  }

  async updateOfferPrice(index: number, newPrice: string, senderAddress: string) {
    const data = new ContractCallPayloadBuilder()
      .setFunction(new ContractFunction("changeOfferPrice"))
      .addArg(new U64Value(index))
      .addArg(new BigUIntValue(newPrice))
      .addArg(new BigUIntValue(0))
      .build();

    const tx = new Transaction({
      value: "0",
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 20000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: "Updating price",
        errorMessage: "Updating price failed :(",
        successMessage: "Fee updated successfully",
      },
      redirectAfterSign: false,
      sessionInformation: "update-price-tx",
    });

    return { sessionId, error };
  }

  async getLastValidOfferId(): Promise<number> {
    const interaction = this.contract.methodsExplicit.getLastValidOfferId();
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return 0;
      }

      const value = firstValue.valueOf();
      const decoded = value.toNumber();

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_MARKET_OFFERS_FAIL,
        status: "error",
        isClosable: true,
        duration: 20000,
      });
      return 0;
    }
  }

  async getIsPaused(): Promise<boolean> {
    const interaction = this.contract.methodsExplicit.getIsPaused();
    const query = interaction.buildQuery();

    try {
      const networkProvider = getNetworkProvider(this.chainID);

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        throw Error(returnMessage);
      }

      const value = firstValue.valueOf();
      const decoded = value;

      return decoded;
    } catch (e) {
      console.error(e);
      this.toast({
        title: labels.ERR_CONTRACT_PARAM_READ,
        status: "error",
        isClosable: true,
        duration: 20000,
      });

      return false;
    }
  }
}

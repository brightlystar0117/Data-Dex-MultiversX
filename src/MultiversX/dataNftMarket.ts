import {
  AbiRegistry,
  SmartContractAbi,
  SmartContract,
  Address,
  ResultsParser,
  BigUIntValue,
  VariadicValue,
  Transaction,
  TransactionPayload,
  ContractFunction,
  List,
  U64Value,
  TokenPayment,
  TokenIdentifierValue,
  AddressValue,
  StringValue,
  TypedValue,
  U32Value,
  AddressType,
  OptionalValue,
} from "@multiversx/sdk-core/out";
import { sendTransactions } from "@multiversx/sdk-dapp/services";
import { refreshAccount } from "@multiversx/sdk-dapp/utils/account";
import { ProxyNetworkProvider } from "@multiversx/sdk-network-providers/out";
import BigNumber from "bignumber.js";
import jsonData from "./ABIs/data_market.abi.json";
import { MarketplaceRequirementsType, OfferType } from "./types";
import { contractsForChain, uxConfig } from "../libs/util";

export class DataNftMarketContract {
  timeout: number;
  dataNftMarketContractAddress: any;
  chainID: string;
  contract: SmartContract;
  itheumToken: string;

  constructor(networkId: string) {
    this.timeout = uxConfig.mxAPITimeoutMs;
    this.dataNftMarketContractAddress = contractsForChain(networkId).market;
    this.chainID = "D";

    if (networkId === "E1") {
      this.chainID = "1";
    }

    const json = JSON.parse(JSON.stringify(jsonData));
    const abiRegistry = AbiRegistry.create(json);
    const abi = new SmartContractAbi(abiRegistry, ["DataNftMintContract"]);

    this.contract = new SmartContract({
      address: new Address(this.dataNftMarketContractAddress),
      abi: abi,
    });

    this.itheumToken = contractsForChain(networkId).itheumToken as unknown as string;
  }

  async getNumberOfOffers() {
    const interaction = this.contract.methods.numberOfOffers([]);
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();

      const { firstValue, returnCode } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (returnCode && returnCode.isSuccess()) {
        const firstValueAsStruct = firstValue as U32Value;
        return firstValueAsStruct.valueOf().toNumber();
      } else {
        const nonOKErr = new Error("getNumberOfOffers returnCode returned a non OK value");
        console.error(nonOKErr);

        return 0;
      }
    } catch (error) {
      console.error(error);

      return 0;
    }
  }

  async sendAcceptOfferEsdtTransaction(index: number, paymentAmount: string, tokenId: string, amount: number, sender: string) {
    const data =
      BigNumber(paymentAmount).comparedTo(0) > 0
        ? TransactionPayload.contractCall()
            .setFunction(new ContractFunction("ESDTTransfer"))
            .addArg(new TokenIdentifierValue(tokenId))
            .addArg(new BigUIntValue(paymentAmount))
            .addArg(new StringValue("acceptOffer"))
            .addArg(new U64Value(index))
            .addArg(new BigUIntValue(amount))
            .build()
        : TransactionPayload.contractCall()
            .setFunction(new ContractFunction("acceptOffer"))
            .addArg(new U64Value(index))
            .addArg(new BigUIntValue(amount))
            .build();

    const offerEsdtTx = new Transaction({
      value: 0,
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      sender: new Address(sender),
      gasLimit: 12000000,
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: offerEsdtTx,
      transactionsDisplayInfo: {
        processingMessage: "Accepting offer",
        errorMessage: "Error occured during accepting offer",
        successMessage: "Offer accepted successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async sendAcceptOfferNftEsdtTransaction(index: number, paymentAmount: string, tokenId: string, nonce: number, amount: number, senderAddress: string) {
    const offerEsdtTx = new Transaction({
      value: 0,
      data: TransactionPayload.contractCall()
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
      gasLimit: 12000000,
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: offerEsdtTx,
      transactionsDisplayInfo: {
        processingMessage: "Accepting offer",
        errorMessage: "Error occured during accepting offer",
        successMessage: "Offer accepted successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async sendAcceptOfferEgldTransaction(index: number, paymentAmount: string, amount: number, senderAddress: string) {
    const offerEgldTx = new Transaction({
      value: paymentAmount,
      data: TransactionPayload.contractCall()
        .setFunction(new ContractFunction("acceptOffer"))
        .addArg(new U64Value(index))
        .addArg(new BigUIntValue(amount))
        .build(),
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 12000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: offerEgldTx,
      transactionsDisplayInfo: {
        processingMessage: "Accepting offer",
        errorMessage: "Error occured during accepting offer",
        successMessage: "Offer accepted successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async sendCancelOfferTransaction(index: number, senderAddress: string) {
    const cancelTx = new Transaction({
      value: 0,
      data: TransactionPayload.contractCall().setFunction(new ContractFunction("cancelOffer")).addArg(new U64Value(index)).build(),
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 12000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: cancelTx,
      transactionsDisplayInfo: {
        processingMessage: "Cancelling offer",
        errorMessage: "Error occured during offer cancellation",
        successMessage: "Offer cancelled successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async addToMarket(addTokenCollection: string, addTokenNonce: number, addTokenQuantity: number, price: number, addressOfSender: string) {
    const askDenominator = 10 ** 18;
    const addERewTx = new Transaction({
      value: 0,
      data: TransactionPayload.contractCall()
        .setFunction(new ContractFunction("ESDTNFTTransfer")) //method
        .addArg(new TokenIdentifierValue(addTokenCollection)) //what token id to send
        .addArg(new U64Value(addTokenNonce)) //what token nonce to send
        .addArg(new BigUIntValue(addTokenQuantity)) //how many tokens to send
        .addArg(new AddressValue(new Address(this.dataNftMarketContractAddress))) //address to send to
        .addArg(new StringValue("addOffer")) //what method to call on the contract
        .addArg(new TokenIdentifierValue(this.itheumToken)) //what token id to ask for
        .addArg(new U64Value(0)) //what nonce to ask for
        .addArg(new BigUIntValue(price * 10 ** 18)) //how much to ask for
        .addArg(new BigUIntValue(addTokenQuantity)) //how many times to divide the amount of tokens sent into
        .build(),
      receiver: new Address(addressOfSender),
      sender: new Address(addressOfSender),
      gasLimit: 12000000,
      chainID: this.chainID,
    });
    await refreshAccount();
    await sendTransactions({
      transactions: addERewTx,
      transactionsDisplayInfo: {
        processingMessage: "Adding Data NFT to marketplace",
        errorMessage: "Error occured",
        successMessage: "Data NFT added to marketplace",
      },
      redirectAfterSign: false,
    });
  }

  async delistDataNft(index: number, delistAmount: number, senderAddress: string) {
    const data = TransactionPayload.contractCall()
      .setFunction(new ContractFunction("cancelOffer"))
      .addArg(new U64Value(index))
      .addArg(new BigUIntValue(delistAmount))
      .build();

    const tx = new Transaction({
      value: "0",
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 12000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: "De-Listing offer",
        errorMessage: "Error occured during de-listing offer",
        successMessage: "Offer de-listed successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async getRequirements(): Promise<MarketplaceRequirementsType | undefined> {
    const interaction = this.contract.methodsExplicit.getRequirements();
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

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
      };
      decoded.buyer_fee = decoded.percentage_cut_from_buyer - decoded.discount_fee_percentage_buyer;

      return decoded;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async viewOffers(startIndex: number, stopIndex: number): Promise<OfferType[]> {
    // this will spread out a new array from startIndex to stopIndex e.g. startIndex=0, stopIndex=5 : you get [1,2,3,4,5]
    const indexRange = Array.from({ length: stopIndex - startIndex }, (_, i) => new U64Value(startIndex + 1 + i));

    const interaction = this.contract.methodsExplicit.viewOffers(indexRange);
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return [];
      }

      const values = firstValue.valueOf();
      const decoded = values.map((value: any) => ({
        index: value.index.toNumber(),
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
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return [];
      }

      const values = firstValue.valueOf();
      const decoded = values.map((value: any) => ({
        index: value.index.toNumber(),
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
      return [];
    }
  }

  async viewOffer(index: number): Promise<OfferType | undefined> {
    const interaction = this.contract.methodsExplicit.viewOffer([
      new U64Value(index),
    ]);
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

      const res = await networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue, returnCode, returnMessage } = new ResultsParser().parseQueryResponse(res, endpointDefinition);

      if (!firstValue || !returnCode.isSuccess()) {
        console.error(returnMessage);
        return undefined;
      }

      const value = firstValue.valueOf();
      const decoded = {
        index: value.index.toNumber(),
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
      return undefined;
    }
  }

  async getUserTotalOffers(userAddress: string): Promise<number> {
    const interaction = this.contract.methodsExplicit.getUserTotalOffers([new AddressValue(new Address(userAddress))]);
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

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
      return 0;
    }
  }

  async updateOfferPrice(index: number, newPrice: string, senderAddress: string) {
    const data = TransactionPayload.contractCall()
      .setFunction(new ContractFunction("changeOfferPrice"))
      .addArg(new U64Value(index))
      .addArg(new BigUIntValue(newPrice))
      .build();

    const tx = new Transaction({
      value: "0",
      data,
      receiver: new Address(this.dataNftMarketContractAddress),
      gasLimit: 12000000,
      sender: new Address(senderAddress),
      chainID: this.chainID,
    });

    await refreshAccount();

    const { sessionId, error } = await sendTransactions({
      transactions: tx,
      transactionsDisplayInfo: {
        processingMessage: "Updating price",
        errorMessage: "Error occured during updating price",
        successMessage: "Price updated successfuly",
      },
      redirectAfterSign: false,
    });

    return { sessionId, error };
  }

  async getHighestOfferIndex(): Promise<number> {
    const interaction = this.contract.methodsExplicit.getHighestOfferIndex();
    const query = interaction.buildQuery();

    try {
      let networkProvider;
      if (this.chainID === "1") {
        networkProvider = new ProxyNetworkProvider("https://gateway.multiversx.com", { timeout: this.timeout });
      } else {
        networkProvider = new ProxyNetworkProvider("https://devnet-gateway.multiversx.com", {
          timeout: this.timeout,
        });
      }

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
      return 0;
    }
  }
}

import React, { useEffect, useState } from "react";
import { CopyIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Heading,
  HStack,
  Link,
  VStack,
  Text,
  Image,
  Stack,
  Flex,
  Badge,
  useToast,
  Spinner,
  useClipboard,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Checkbox,
  useDisclosure,
} from "@chakra-ui/react";
import { AbiRegistry, BinaryCodec } from "@multiversx/sdk-core/out";
import { useGetAccountInfo, useGetPendingTransactions } from "@multiversx/sdk-dapp/hooks";
import axios from "axios";
import BigNumber from 'bignumber.js';
import moment from "moment";
import { useNavigate, useParams, Link as ReactRouterLink } from "react-router-dom";
import { CHAIN_TX_VIEWER, convertWeiToEsdt, isValidNumericCharacter, sleep, uxConfig } from "libs/util";
import { convertToLocalString, printPrice } from "libs/util2";
import { getAccountTokenFromApi, getApi, getItheumPriceFromApi } from "MultiversX/api";
import { DataNftMarketContract } from "MultiversX/dataNftMarket";
import { getTokenWantedRepresentation, tokenDecimals } from "MultiversX/tokenUtils";
import { MarketplaceRequirementsType, OfferType } from "MultiversX/types";
import { useChainMeta } from "store/ChainMetaContext";
import TokenTxTable from "Tables/TokenTxTable";
import ShortAddress from "UtilComps/ShortAddress";
import DataNFTProcureReadModal from "./DataNFTProcureReadModal";
import jsonData from "../MultiversX/ABIs/datanftmint.abi.json";

type DataNFTDetailsProps = {
  owner?: string;
  listed?: number;
  showConnectWallet?: boolean;
  tokenIdProp?: string;
  offerIdProp?: number;
};

export default function DataNFTDetails(props: DataNFTDetailsProps) {
  const { chainMeta: _chainMeta } = useChainMeta();
  const { tokenId: tokenIdParam, offerId: offerIdParam } = useParams();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { address } = useGetAccountInfo();

  const [nftData, setNftData] = useState<any>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(true);
  const navigate = useNavigate();
  const [price, setPrice] = useState<number>(0);
  const [itheumPrice, setItheumPrice] = useState<number | undefined>();

  const owner = props.owner || "";
  const listed = props.listed || 0;
  const showConnectWallet = props.showConnectWallet || false;
  const toast = useToast();
  const tokenId = props.tokenIdProp || tokenIdParam; // priority 1 is tokenIdProp
  const offerId = props.offerIdProp || offerIdParam?.split('-')[1];
  const ChainExplorer = CHAIN_TX_VIEWER[_chainMeta.networkId as keyof typeof CHAIN_TX_VIEWER];
  // const nftExplorerUrl = _chainMeta.networkId ? getNftLink(_chainMeta.networkId, tokenId || "") : "";
  const marketContract = new DataNftMarketContract(_chainMeta.networkId);

  const { onCopy } = useClipboard(`${window.location.protocol + "//" + window.location.host}/dataNfts/marketplace/${tokenId}/offer-${offerId}`);
  const [offer, setOffer] = useState<OfferType | undefined>();
  const [amount, setAmount] = useState<number>(1);
  const [amountError, setAmountError] = useState<string>('');
  const [readTermsChecked, setReadTermsChecked] = useState(false);
  const { isOpen: isReadTermsModalOpen, onOpen: onReadTermsModalOpen, onClose: onReadTermsModalClose } = useDisclosure();
  const { isOpen: isProcureModalOpen, onOpen: onProcureModalOpen, onClose: onProcureModalClose } = useDisclosure();
  const [marketRequirements, setMarketRequirements] = useState<MarketplaceRequirementsType | undefined>(undefined);
  const [wantedTokenBalance, setWantedTokenBalance] = useState<string>("0");
  const [feePrice, setFeePrice] = useState<string>("");
  const [fee, setFee] = useState<number>(0);

  useEffect(() => {
    if (_chainMeta?.networkId) {
      // console.log('********** DataNFTDetails LOAD A _chainMeta READY ', _chainMeta);

      getTokenDetails();
      getTokenHistory();

      (async () => {
        const _itheumPrice = await getItheumPriceFromApi();
        setItheumPrice(_itheumPrice);
      })();

      (async () => {
        const _marketRequirements = await marketContract.getRequirements();
        setMarketRequirements(_marketRequirements);
      })();
    }
  }, [_chainMeta]);

  useEffect(() => {
    if (_chainMeta.networkId && offerId != null) {
      (async () => {
        const _offer = await marketContract.viewOffer(Number(offerId));
        setOffer(_offer);

        if (_offer) {
          setAmount(Number(_offer.quantity));
        }
      })();
    }
  }, [_chainMeta, offerId]);
  useEffect(() => {
    if (_chainMeta.networkId && offer) {
      (async () => {
        // wanted_token must be ESDT (not NFT, SFT or Meta-ESDT)
        const _token = await getAccountTokenFromApi(address, offer.wanted_token_identifier, _chainMeta.networkId);
        if (_token) {
          setWantedTokenBalance(_token.balance ? _token.balance : "0");
        } else {
          setWantedTokenBalance("0");
        }
      })();
    }
  }, [_chainMeta, offer]);
  useEffect(() => {
    if (offer) {
      setFeePrice(
        printPrice(
          convertWeiToEsdt(offer.wanted_token_amount, tokenDecimals(offer.wanted_token_identifier)).toNumber(),
          getTokenWantedRepresentation(offer.wanted_token_identifier, offer.wanted_token_nonce)
        )
      );
      setFee(convertWeiToEsdt(offer.wanted_token_amount, tokenDecimals(offer.wanted_token_identifier)).toNumber());
    }
  }, [offer]);

  function getTokenDetails() {
    const apiLink = getApi(_chainMeta.networkId);
    const nftApiLink = `https://${apiLink}/nfts/${tokenId}`;
    axios.get(nftApiLink).then((res) => {
      const _nftData = res.data;
      const attributes = decodeNftAttributes(_nftData);
      _nftData.attributes = attributes;
      setNftData(_nftData);
      setIsLoadingDetails(false);
    }).catch((err) => {
      toast({
        id: "er3",
        title: "ER3: Could not fetch Data NFT-FT details",
        description: err.message,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    });
  }

  function getTokenHistory() {
    const apiUrl = getApi(_chainMeta.networkId);
    axios.get(`https://${apiUrl}/nfts/${tokenId}/transactions?status=success&function=addOffer&size=1&receiver=${_chainMeta?.contracts?.market}`).then((res) => {
      const txs = res.data;
      if (txs.length > 0) {
        const tx = txs[0];
        const hexPrice = Buffer.from(tx.data, "base64").toString().split("@")[8];
        let _price = 0;
        if (hexPrice.trim() !== "") {
          _price = convertWeiToEsdt(parseInt("0x" + hexPrice, 16)).toNumber();
        }
        setPrice(_price);
      } else {
        setPrice(-1);
      }
      setIsLoadingPrice(false);
    }).catch((err) => {
      toast({
        id: "er3",
        title: "ER3: Could not fetch Data NFT-FT details",
        description: err.message,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    });
  }

  function decodeNftAttributes(nft: any) {
    const json = JSON.parse(JSON.stringify(jsonData));
    const abiRegistry = AbiRegistry.create(json);
    const dataNftAttributes = abiRegistry.getStruct("DataNftAttributes");
    const decodedAttributes = new BinaryCodec().decodeTopLevel(Buffer.from(nft.attributes, "base64"), dataNftAttributes).valueOf();
    const dataNFT = {
      id: nft.identifier,
      nftImgUrl: nft.url,
      dataPreview: decodedAttributes["data_preview_url"].toString(),
      dataStream: decodedAttributes["data_stream_url"].toString(),
      dataMarshal: decodedAttributes["data_marshal_url"].toString(),
      tokenName: nft.name,
      creator: decodedAttributes["creator"].toString(),
      creationTime: new Date(Number(decodedAttributes["creation_time"]) * 1000),
      supply: nft.supply ? Number(nft.supply) : 0,
      description: decodedAttributes["description"].toString(),
      title: decodedAttributes["title"].toString(),
      royalties: nft.royalties ? nft.royalties / 100 : 0,
      nonce: nft.nonce,
      collection: nft.collection,
      balance: 0,
    };
    return dataNFT;
  }

  function isLoadingNftData() {
    return (isLoadingDetails || isLoadingPrice);
  }

  const onProcure = async () => {
    if (!address) {
      toast({
        title: "Connect your wallet",
        status: "error",
        isClosable: true,
      });
      return;
    }
    if (!marketRequirements || !marketContract) {
      toast({
        title: "Data is not loaded",
        status: "error",
        isClosable: true,
      });
      return;
    }
    if (!(offer && nftData)) {
      toast({
        title: "No NFT data",
        status: "error",
        isClosable: true,
      });
      return;
    }
    if (!readTermsChecked) {
      toast({
        title: "You must READ and Agree on Terms of Use",
        status: "error",
        isClosable: true,
      });
      return;
    }

    const paymentAmount = BigNumber(offer.wanted_token_amount).multipliedBy(amount);
    if (offer.wanted_token_identifier == "EGLD") {
      marketContract.sendAcceptOfferEgldTransaction(offer.index, paymentAmount.toFixed(), amount, address);
    } else {
      if (offer.wanted_token_nonce === 0) {
        marketContract.sendAcceptOfferEsdtTransaction(
          offer.index,
          paymentAmount.toFixed(),
          offer.wanted_token_identifier,
          amount,
          address
        );
      } else {
        marketContract.sendAcceptOfferNftEsdtTransaction(
          offer.index,
          paymentAmount.toFixed(),
          offer.wanted_token_identifier,
          offer.wanted_token_nonce,
          amount,
          address
        );
      }
    }

    // a small delay for visual effect
    await sleep(0.5);
    onProcureModalClose();
  };

  return (
    <Box>{!isLoadingNftData() ? <Box>
      <Flex direction={"column"} alignItems={"flex-start"}>
        {tokenIdParam &&
          <>
            <Heading size="lg" marginBottom={4}>
              Data NFT Marketplace
            </Heading>
            <HStack>
              <Button
                colorScheme="teal"
                width={{ base: "120px", md: "160px" }}
                _disabled={{ opacity: 1 }}
                fontSize={{ base: "sm", md: "md" }}
                onClick={() => {
                  navigate("/datanfts/marketplace/market/0");
                }}
                marginRight={2}>
                Public Marketplace
              </Button>
              {/* <Link href={nftExplorerUrl} isExternal>
                {nftData.name} <ExternalLinkIcon mx="2px" />
              </Link> */}
            </HStack>
          </>
        }
        <Box width={"100%"} marginY={tokenIdParam ? "56px" : "30px"}>
          <Stack
            flexDirection={{ base: "column", md: "row" }}
            justifyContent={{ base: "center", md: "flex-start" }}
            alignItems={{ base: "center", md: "flex-start" }}>
            <Link
              as={ReactRouterLink}
              to={`/dataNfts/marketplace/${tokenId}/offer-${offerId}`}
              boxSize={{ base: "240px", md: "400px" }}
              marginRight={{ base: 0, md: "2.4rem" }}
            >
              <Image
                objectFit={"cover"}
                src={nftData.url}
                alt={"Data NFT Image"}
              />
            </Link>

            <VStack alignItems={"flex-start"} gap={"15px"}>
              <Flex direction="row" alignItems="center" gap="3">
                <Text fontSize="36px" noOfLines={2}>
                  {nftData.attributes?.title}
                </Text>
                <Button
                  fontSize="xl"
                  onClick={() => {
                    onCopy();
                    toast({
                      title: "NFT detail page link is copied!",
                      status: "success",
                      isClosable: true,
                    });
                  }}
                >
                  <CopyIcon />
                </Button>
              </Flex>

              <Box color="gray.100" fontSize="xl">
                <Link href={`${ChainExplorer}/nfts/${nftData.identifier}`} isExternal>
                  {nftData.identifier}
                  <ExternalLinkIcon mx="6px" />
                </Link>
              </Box>
              <Flex direction={{ base: "column", md: "row" }} gap="3">
                <Text fontSize={"32px"} color={"#89DFD4"} fontWeight={700} fontStyle={"normal"} lineHeight={"36px"}>
                  {price > 0 ? `Last listing price: ${price} ITHEUM ` + (itheumPrice ? `(${convertToLocalString(price * itheumPrice, 2)} USD)` : '') : price === 0 ? "Last listing price: FREE" : "Not Listed"}
                </Text>
                {showConnectWallet && (
                  <Button fontSize={{ base: "sm", md: "md" }} onClick={() => navigate("/")}>
                    Connect MultiversX Wallet
                  </Button>
                )}
              </Flex>
              <Text fontSize={"22px"} noOfLines={2}>
                {nftData.attributes?.description}
              </Text>
              <Badge fontSize={"lg"} borderRadius="full" colorScheme="blue">
                Fully Transferable License
              </Badge>
              <Flex direction={"column"} gap="1">
                <Box color="gray.400" fontSize="lg">
                  Creator: <ShortAddress fontSize="lg" address={nftData.attributes?.creator}></ShortAddress>
                  <Link href={`${ChainExplorer}/accounts/${nftData.attributes?.creator}`} isExternal>
                    <ExternalLinkIcon mx="4px" />
                  </Link>
                </Box>
                {owner && (
                  <Box color="gray.400" fontSize="lg">
                    Owner: <ShortAddress fontSize="lg" address={owner}></ShortAddress>
                    <Link href={`${ChainExplorer}/accounts/${owner}`} isExternal>
                      <ExternalLinkIcon mx="4px" />
                    </Link>
                  </Box>
                )}
              </Flex>
              <Box display="flex" justifyContent="flex-start">
                <Text fontSize="lg">{`Creation time: ${moment(nftData.attributes?.creationTime).format(uxConfig.dateStr)}`}</Text>
              </Box>
              <Flex direction={"column"} gap="1" color="gray.400" fontSize="lg">
                <Text>{`Listed: ${offer ? offer.quantity : '-'}`}</Text>
                <Text>{`Total supply: ${nftData.supply}`}</Text>
                <Text>{`Royalty: ${Math.round(nftData.royalties * 100) / 100}%`}</Text>
                <Text>
                  {`Fee per NFT: `}
                  {marketRequirements && offer ? (
                    <>
                      {printPrice(
                        convertWeiToEsdt(
                          BigNumber(offer.wanted_token_amount)
                            .multipliedBy(10000)
                            .div(10000 + marketRequirements.buyer_fee),
                          tokenDecimals(offer.wanted_token_identifier)
                        ).toNumber(),
                        getTokenWantedRepresentation(offer.wanted_token_identifier, offer.wanted_token_nonce)
                      )}
                      {' '}
                      {itheumPrice ? `(${convertToLocalString(convertWeiToEsdt(
                        BigNumber(offer.wanted_token_amount)
                          .multipliedBy(10000)
                          .div(10000 + marketRequirements.buyer_fee),
                        tokenDecimals(offer.wanted_token_identifier)
                      ).toNumber() * itheumPrice, 2)} USD)` : ''}
                    </>
                  ) : (
                    "-"
                  )}
                </Text>
              </Flex>

              <Button
                mt="2"
                size="md"
                colorScheme="teal"
                height="7"
                variant="outline"
                onClick={() => {
                  window.open(nftData.dataPreview);
                }}>
                Preview Data
              </Button>
              {offer ? (
                <Box>
                  <HStack>
                    <Text fontSize="md">How many to procure </Text>
                    <NumberInput
                      size="sm"
                      maxW={24}
                      step={1}
                      min={1}
                      max={offer.quantity}
                      isValidCharacter={isValidNumericCharacter}
                      value={amount}
                      defaultValue={1}
                      onChange={(valueAsString) => {
                        const value = Number(valueAsString);
                        let error = "";
                        if (value <= 0) {
                          error = "Cannot be zero or negative";
                        } else if (value > offer.quantity) {
                          error = "Cannot exceed balance";
                        }
                        setAmountError(error);
                        setAmount(value);
                      }}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      width="72px"
                      isDisabled={hasPendingTransactions || !!amountError}
                      onClick={() => {
                        setReadTermsChecked(false);
                        onProcureModalOpen();
                      }}>
                      Procure
                    </Button>
                  </HStack>
                  <Text color="red.400" fontSize="sm" mt="1" ml="136px">
                    {amountError}
                  </Text>
                </Box>
              ) : (
                <HStack h="3rem"></HStack>
              )}
            </VStack>
          </Stack>
        </Box>
      </Flex>
      <VStack alignItems={"flex-start"}>
        <Heading size="lg" marginBottom={2}>
          Data NFT Activity
        </Heading>
        <Box width={"100%"}>
          <TokenTxTable page={1} tokenId={tokenId} />
        </Box>
      </VStack>

      {
        nftData && offer && (
          <Modal isOpen={isProcureModalOpen} onClose={onProcureModalClose} closeOnEsc={false} closeOnOverlayClick={false}>
            <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px) hue-rotate(90deg)" />
            <ModalContent>
              <ModalBody py={6}>
                <HStack spacing="5" alignItems="center">
                  <Box flex="4" alignContent="center">
                    <Text fontSize="lg">Procure Access to Data NFTs</Text>
                    <Flex mt="1">
                      <Text fontWeight="bold" fontSize="md" backgroundColor="blackAlpha.300" px="1" textAlign="center">
                        {nftData.tokenName}
                      </Text>
                    </Flex>
                  </Box>
                  <Box flex="1">
                    <Image src={nftData.nftImgUrl} h="auto" w="100%" borderRadius="md" m="auto" />
                  </Box>
                </HStack>
                <Flex fontSize="md" mt="2">
                  <Box w="140px">How many</Box>
                  <Box>: {amount ? amount : 1}</Box>
                </Flex>
                <Flex fontSize="md" mt="2">
                  <Box w="140px">Fee per NFT</Box>
                  <Box>
                    {marketRequirements ? (
                      <>
                        {": "}
                        {printPrice(
                          convertWeiToEsdt(
                            BigNumber(offer.wanted_token_amount)
                              .multipliedBy(10000)
                              .div(10000 + marketRequirements.buyer_fee),
                            tokenDecimals(offer.wanted_token_identifier)
                          ).toNumber(),
                          getTokenWantedRepresentation(offer.wanted_token_identifier, offer.wanted_token_nonce)
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </Box>
                </Flex>
                <Flex>
                  {BigNumber(offer.wanted_token_amount).multipliedBy(amount).comparedTo(wantedTokenBalance) >
                    0 && (
                      <Text ml="146" color="red.400" fontSize="xs" mt="1 !important">
                        Your wallet token balance is too low to proceed
                      </Text>
                    )}
                </Flex>
                <Flex fontSize="md" mt="2">
                  <Box w="140px">Buyer Fee (per NFT)</Box>
                  <Box>
                    :{" "}
                    {marketRequirements
                      ? `${marketRequirements.buyer_fee / 100}% (${convertWeiToEsdt(
                        BigNumber(offer.wanted_token_amount)
                          .multipliedBy(marketRequirements.buyer_fee)
                          .div(10000 + marketRequirements.buyer_fee),
                        tokenDecimals(offer.wanted_token_identifier)
                      ).toNumber()} ${getTokenWantedRepresentation(
                        offer.wanted_token_identifier,
                        offer.wanted_token_nonce
                      )})`
                      : "-"}
                  </Box>
                </Flex>
                <Flex fontSize="md" mt="2">
                  <Box w="140px">Total Fee</Box>
                  <Box>
                    {": "}
                    {marketRequirements ? <>{feePrice} {fee && itheumPrice ? `(${convertToLocalString(fee * itheumPrice, 2)} USD)` : ''}</> : "-"}
                  </Box>
                </Flex>
                <Flex fontSize="xs" mt="0">
                  <Box w="146px"></Box>
                  <Box>
                    {marketRequirements ? (
                      <>
                        {BigNumber(offer.wanted_token_amount).comparedTo(0) <= 0 ? (
                          ""
                        ) : (
                          <>
                            {" " +
                              convertWeiToEsdt(
                                BigNumber(offer.wanted_token_amount)
                                  .multipliedBy(amount)
                                  .multipliedBy(10000)
                                  .div(10000 + marketRequirements.buyer_fee),
                                tokenDecimals(offer.wanted_token_identifier)
                              ).toNumber() +
                              " "}
                            {getTokenWantedRepresentation(offer.wanted_token_identifier, offer.wanted_token_nonce)}
                            {" + "}
                            {convertWeiToEsdt(
                              BigNumber(offer.wanted_token_amount)
                                .multipliedBy(amount)
                                .multipliedBy(marketRequirements.buyer_fee)
                                .div(10000 + marketRequirements.buyer_fee),
                              tokenDecimals(offer.wanted_token_identifier)
                            ).toNumber()}
                            {" " +
                              getTokenWantedRepresentation(offer.wanted_token_identifier, offer.wanted_token_nonce)}
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </Box>
                </Flex>
                <Flex mt="4 !important">
                  <Button colorScheme="teal" variant="outline" size="sm" onClick={onReadTermsModalOpen}>
                    Read Terms of Use
                  </Button>
                </Flex>
                <Checkbox size="sm" mt="3 !important" isChecked={readTermsChecked} onChange={(e: any) => setReadTermsChecked(e.target.checked)}>
                  I have read all terms and agree to them
                </Checkbox>
                {!readTermsChecked && (
                  <Text color="red.400" fontSize="xs" mt="1 !important">
                    You must READ and Agree on Terms of Use
                  </Text>
                )}
                <Flex justifyContent="end" mt="4 !important">
                  <Button
                    colorScheme="teal"
                    size="sm"
                    mx="3"
                    onClick={onProcure}
                    isDisabled={
                      !readTermsChecked
                      || BigNumber(offer.wanted_token_amount).multipliedBy(amount).comparedTo(wantedTokenBalance) > 0
                    }>
                    Proceed
                  </Button>
                  <Button colorScheme="teal" size="sm" variant="outline" onClick={onProcureModalClose}>
                    Cancel
                  </Button>
                </Flex>
              </ModalBody>
            </ModalContent>
          </Modal>
        )
      }

      <DataNFTProcureReadModal
        isReadTermsModalOpen={isReadTermsModalOpen}
        onReadTermsModalOpen={onReadTermsModalOpen}
        onReadTermsModalClose={onReadTermsModalClose}
      />
    </Box>
      : <Flex direction={"column"} justifyContent={"center"} alignItems={"center"} minHeight={"500px"}>
        <Spinner size={"xl"} thickness="4px" speed="0.64s" emptyColor="gray.200" color="teal" label="Fetching Data NFT-FT details..." />
      </Flex>
    }
    </Box>
  );
}


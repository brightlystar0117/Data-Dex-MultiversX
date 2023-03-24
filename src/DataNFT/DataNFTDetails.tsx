import React, { useEffect, useState } from "react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Box, Button, Heading, HStack, Link, VStack, Text, Image, Stack, Flex, Badge, useToast, Spinner } from "@chakra-ui/react";
import { AbiRegistry, BinaryCodec } from "@multiversx/sdk-core/out";
import axios from "axios";
import moment from "moment";
import { useNavigate, useParams, Link as ReactRouterLink } from "react-router-dom";
import { CHAIN_TX_VIEWER, convertWeiToEsdt, uxConfig } from "libs/util";
import { convertToLocalString } from "libs/util2";
import { getApi, getItheumPriceFromApi, getNftLink } from "MultiversX/api";
import { useChainMeta } from "store/ChainMetaContext";
import TokenTxTable from "Tables/TokenTxTable";
import ShortAddress from "UtilComps/ShortAddress";
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
  const nftExplorerUrl = _chainMeta.networkId ? getNftLink(_chainMeta.networkId, tokenId || "") : "";

  useEffect(() => {
    if (_chainMeta?.networkId) {
      // console.log('********** DataNFTDetails LOAD A _chainMeta READY ', _chainMeta);

      getTokenDetails();
      getTokenHistory();

      (async () => {
        const _itheumPrice = await getItheumPriceFromApi();
        setItheumPrice(_itheumPrice);
      })();

    }
  }, [_chainMeta]);

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
            >
              <Image
                boxSize={{ base: "240px", md: "400px" }}
                objectFit={"cover"}
                src={nftData.url}
                alt={"Data NFT Image"}
                marginRight={{ base: 0, md: "2.4rem" }}
              />
            </Link>

            <VStack alignItems={"flex-start"} gap={"15px"}>
              <Text fontSize="36px" noOfLines={2}>
                {nftData.attributes?.title}
              </Text>
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
                <Box color="gray.600" fontSize="lg">
                  Creator: <ShortAddress fontSize="lg" address={nftData.attributes?.creator}></ShortAddress>
                  <Link href={`${ChainExplorer}/accounts/${nftData.attributes?.creator}`} isExternal>
                    <ExternalLinkIcon mx="4px" />
                  </Link>
                </Box>
                {owner && (
                  <Box color="gray.600" fontSize="lg">
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
              <Flex direction={"column"} gap="1" color="gray.600" fontSize="lg">
                {listed > 0 && <Text>{`Listed: ${listed}`}</Text>}
                <Text>{`Total supply: ${nftData.supply}`}</Text>
                <Text>{`Royalty: ${Math.round(nftData.royalties * 100) / 100}%`}</Text>
              </Flex>
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
    </Box>
      : <Flex direction={"column"} justifyContent={"center"} alignItems={"center"} minHeight={"500px"}>
        <Spinner size={"xl"} thickness="4px" speed="0.64s" emptyColor="gray.200" color="teal" label="Fetching Data NFT-FT details..." />
      </Flex>
    }
    </Box>
  );
}


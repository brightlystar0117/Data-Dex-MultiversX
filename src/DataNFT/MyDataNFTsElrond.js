import React, { useState, useEffect } from 'react';
import { Box, Stack } from '@chakra-ui/layout';
import {
  Skeleton, CloseButton, HStack, Badge,
  Alert, AlertIcon, AlertTitle, Heading, Image, Flex, Link, Text, Tooltip
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import ShortAddress from 'UtilComps/ShortAddress';
import SkeletonLoadingList from 'UtilComps/SkeletonLoadingList';
import { sleep, buyOnOpenSea, contractsForChain } from 'libs/util';
import { CHAIN_TOKEN_SYMBOL, OPENSEA_CHAIN_NAMES, CHAIN_NAMES, CHAIN_TX_VIEWER } from 'libs/util';
import { useChainMeta } from 'store/ChainMetaContext';
import { getNftsOfAcollectionForAnAddress } from 'Elrond/api';
import { useGetAccountInfo } from '@elrondnetwork/dapp-core';
import dataNftMintJson from '../Elrond/ABIs/datanftmint.abi.json';
import { AbiRegistry, ArgSerializer, BinaryCodec, EndpointParameterDefinition, SmartContractAbi, StructType, Type } from '@elrondnetwork/erdjs/out';

export default function MyDataNFTsElrond() {
  const { chainMeta: _chainMeta, setChainMeta } = useChainMeta();
  const { address } = useGetAccountInfo();
  const [onChainNFTs, setOnChainNFTs] = useState(null);
  const [usersDataNFTCatalog, setUsersDataNFTCatalog] = useState(null);
  const [oneNFTImgLoaded, setOneNFTImgLoaded] = useState(false);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    getOnChainNFTs();
  }, []);

  // use this effect to parse  the raw data into a catalog that is easier to render in the UI
  useEffect(() => {
    const parseOnChainNfts = async () => {
      if (onChainNFTs !== null) {
        if (onChainNFTs.length > 0) {
          const codec = new BinaryCodec();
          const json = JSON.parse(JSON.stringify(dataNftMintJson));
          const abiRegistry = AbiRegistry.create(json);
          const abi = new SmartContractAbi(abiRegistry, ['DataNftMintContract']);
          const dataNftAttributes = abiRegistry.getStruct('DataNftAttributes');
          
            // some logic to loop through the raw onChainNFTs and build the usersDataNFTCatalog
            const usersDataNFTCatalogLocal = [];

            onChainNFTs.map(nft => {
                  const decodedAttributes = codec.decodeTopLevel(Buffer.from(nft['attributes'], 'base64'), dataNftAttributes).valueOf();
                  const dataNFT = {};
                  dataNFT.id = nft['identifier']; // ID of NFT -> done
                  dataNFT.nftImgUrl = nft['url']; // image URL of of NFT -> done
                  dataNFT.dataPreview = decodedAttributes['data_preview_url'].toString(); // preview URL for NFT data stream -> done
                  dataNFT.dataStream = decodedAttributes['data_stream_url'].toString(); // data stream URL -> done
                  dataNFT.dataMarshal = decodedAttributes['data_marchal_url'].toString(); // data stream URL -> done
                  dataNFT.tokenName = nft['name']; // is this different to NFT ID? -> yes, name can be chosen by the user
                  dataNFT.txHash = 'xx'; // TX Hash for where NFT gt minted by user (possible?) -> only possible if we do extra api calls
                  dataNFT.txNetworkId = 'ED' // devnet or mainet ID -> done
                  dataNFT.feeInTokens = '100' // how much in ITHEUM tokens => should not appear here as it's in the wallet, not on the market
                  dataNFT.creator = decodedAttributes['creator'].toString(); // initial creator of NFT
                  dataNFT.creationTime = new Date(Number(decodedAttributes['creation_time'])*1000); // initial creation time of NFT

                  usersDataNFTCatalogLocal.push(dataNFT);
            })
            setUsersDataNFTCatalog(usersDataNFTCatalogLocal);
        } else {
          await sleep(5);
          setNoData(true);
        }
      }
    };
    parseOnChainNfts();
  }, [onChainNFTs]);

  // get the raw NFT data from the blockchain for the user
  const getOnChainNFTs = async() => {
    const onChainNfts = await getNftsOfAcollectionForAnAddress(address,'DATANFTV1-5425ef','not_E1');
    setOnChainNFTs(onChainNfts);
  }

  return (
    <Stack spacing={5}>
      <Heading size="lg">Data NFT Wallet</Heading>
      <Heading size="xs" opacity=".7">Below are the Data NFTs you created and/or purchased on the current chain</Heading>

      {(!usersDataNFTCatalog || usersDataNFTCatalog && usersDataNFTCatalog.length === 0) &&
        <>{!noData && <SkeletonLoadingList /> || <Text onClick={getOnChainNFTs}>No data yet...</Text>}</> ||
        <Flex wrap="wrap" spacing={5}>
          {usersDataNFTCatalog && usersDataNFTCatalog.map((item) => <Box key={item.id} maxW="xs" borderWidth="1px" borderRadius="lg" overflow="hidden" mr="1rem" w="250px" mb="1rem">
            <Flex justifyContent="center" pt={5}>
              <Skeleton isLoaded={oneNFTImgLoaded} h={200}>
                <Image src={item.nftImgUrl} alt={item.dataPreview} h={200} w={200} borderRadius="md" onLoad={() => setOneNFTImgLoaded(true)} />
              </Skeleton>
            </Flex>

            <Flex p="3" direction="column" justify="space-between" height="250px">
              <Box
                fontSize="sm"
                mt="1"
                fontWeight="semibold"
                as="h4"
                lineHeight="tight">
                {item.nftName}
              </Box>

              <Box as="span" color="gray.600" fontSize="sm" flexGrow="1">
                {`${item.feeInTokens} ${CHAIN_TOKEN_SYMBOL(_chainMeta.networkId)}`}
              </Box>

              <Box mt="5">
                {item.stillOwns && <Badge borderRadius="full" px="2" colorScheme="teal">
                  {item.originalOwner && 'you are the owner' || 'you are the creator & owner' }
                </Badge> || <Badge borderRadius="full" px="2" colorScheme="red" display="none">
                  sold
                </Badge>}

                <Badge borderRadius="full" px="2" colorScheme="blue">
                  Fully Transferable License
                </Badge>

                <Badge borderRadius="full" px="2" colorScheme="blue">
                  Data Stream
                </Badge>

                <HStack mt="5">
                  <Text fontSize="xs">Mint TX: </Text>
                  <ShortAddress address={item.txHash} />
                  <Link href={`${CHAIN_TX_VIEWER[item.txNetworkId]}${item.txHash}`} isExternal><ExternalLinkIcon mx="2px" /></Link>
                </HStack>

                <HStack mt=".5">
                  <Text fontSize="xs">Download Data File</Text>
                    <Link href={item.stream_url} isExternal><ExternalLinkIcon mx="2px" /></Link>
                </HStack>
              </Box>              
            </Flex>
          </Box>)}
          
        </Flex>
      }
    </Stack>
  );
};

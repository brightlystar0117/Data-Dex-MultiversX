import React, { useState, useEffect } from 'react';
import { Box, Stack } from '@chakra-ui/layout';
import {
  Skeleton, CloseButton, HStack, Badge, ButtonGroup, Button,
  Alert, AlertIcon, AlertTitle, Heading, Image, Flex, Link, Text, Tooltip, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverArrow, PopoverCloseButton, PopoverBody, useDisclosure, ModalOverlay, ModalContent, Modal, ModalHeader, ModalBody
} from '@chakra-ui/react';
import SkeletonLoadingList from 'UtilComps/SkeletonLoadingList';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks/account';
import { useGetPendingTransactions } from '@multiversx/sdk-dapp/hooks/transactions';
import { DataNftMarketContract } from '../MultiversX/dataNftMarket';
import { roundDown, hexZero, getTokenWantedRepresentation, getTokenImgSrc, tokenDecimals } from '../MultiversX/tokenUtils.js';
import { getApi } from 'MultiversX/api';
import { DataNftMintContract } from 'MultiversX/dataNftMint';
import { useChainMeta } from 'store/ChainMetaContext';
import { getNftsByIds } from 'MultiversX/api2';
import { DataNftMetadataType } from 'MultiversX/types';

export default function Marketplace() {
  const { chainMeta: _chainMeta } = useChainMeta() as any;
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const isLoggedIn = Boolean(address);
  const [tabState, setTabState] = useState<number>(1);  // 1 for "Public Marketplace", 2 for "My Data NFTs"
  const [tokensForSale, setTokensForSale] = useState<any[]>([]);
  const [amountOfTokens, setAmountOfTokens] = useState<any>({});
  const [numberOfPages, setNumberOfPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<any>({});
  const [nftMetadatas, setNftMetadatas] = useState<DataNftMetadataType[]>([]);
  const contract = new DataNftMarketContract('ED');
  
  const { isOpen: isProcureModalOpen, onOpen: onProcureModalOpen, onClose: onProcureModalClose } = useDisclosure();

  const [oneNFTImgLoaded, setOneNFTImgLoaded] = useState(false);
  const [noData, setNoData] = useState(false);

  const [userData, setUserData] = useState<any>({});
  const mintContract = new DataNftMintContract(_chainMeta.networkId);

  useEffect(() => {
    contract.getNumberOfOffers().then((nr:any) => {
      setNumberOfPages(Math.ceil(nr / 25));
    })
  }, [hasPendingTransactions]);

  useEffect(() => {
    (async () => {
      const _offers: any[] = await contract.getOffers(0, 25);
      setTokensForSale(_offers);
  
      let amounts: any = {};
      for (const offer of _offers) {
        amounts[offer.index] = 1;
      }
      setAmountOfTokens(amounts);

      const nftIds = _offers.map(offer => `${offer.have.identifier}-${hexZero(offer.have.nonce)}`);
      const _nfts = await getNftsByIds(nftIds, _chainMeta.networkId);
      const _metadatas: DataNftMetadataType[] = [];
      for (let i = 0; i < _nfts.length; i++) {
        _metadatas.push(mintContract.decodeNftAttributes(_nfts[i], i));
      }
      console.log('_metadatas', _metadatas);
      setNftMetadatas(_metadatas);
    })();
  }, [currentPage, hasPendingTransactions]);
  
  const getUserData = async() => {
    if (address && !hasPendingTransactions) {
      const _userData = await mintContract.getUserDataOut(address, _chainMeta.contracts.itheumToken);
      setUserData(_userData);
    }
  };

  useEffect(() => {
    getUserData();
  }, [address, hasPendingTransactions]);

  return (
    <>
      <Stack spacing={5}>
        <Heading size="lg">Data NFT Marketplace</Heading>
        <Flex
          mt="5"
          gap='12px'
          justifyContent={{ base: 'center', md: 'flex-start' }}
          flexDirection={{ base: 'row', md: 'row' }}
        >
          <Button
            colorScheme="teal"
            width={{ base: '160px', md: '160px' }}
            disabled={tabState === 1}
            onClick={() => setTabState(1)}
          >
            Public Marketplace
          </Button>
          <Button
            colorScheme="teal"
            width={{ base: '160px', md: '160px' }}
            disabled={tabState === 2}
            onClick={() => setTabState(2)}
          >
            My Data NFTs
          </Button>
        </Flex>

        {(!tokensForSale || tokensForSale && tokensForSale.length === 0) &&
          <>{!noData && <SkeletonLoadingList /> || <Text>No data yet...</Text>}</> ||
          <Flex wrap="wrap">

            {tokensForSale && tokensForSale.map((token) => <Box key={token.index} maxW="xs" borderWidth="1px" borderRadius="lg" overflow="wrap" mr="1rem" w="250px" mb="1rem" position="relative">
              <Flex justifyContent="center" pt={5}>
                <Skeleton isLoaded={oneNFTImgLoaded} h={200}>
                  <Image
                    src={`https://${getApi('ED')}/nfts/${token['have']['identifier']}-${hexZero(token['have']['nonce'])}/thumbnail`}
                    alt={'item.dataPreview'} h={200} w={200} borderRadius="md" onLoad={() => setOneNFTImgLoaded(true)} />
                </Skeleton>
              </Flex>

              <Flex p="3" direction="column" justify="flex-start" height="150px">
                <Box as="span" fontSize="sm">
                  {(
                    token['have']['amount'] /
                    Math.pow(10, tokenDecimals(token['have']['identifier']))
                  ).toLocaleString() + ' '}{' '}
                  x{' '}
                  {getTokenWantedRepresentation(
                    token['have']['identifier'],
                    token['have']['nonce']
                  )}
                </Box>

                <Box as="span" fontSize="sm">
                  <Text>Supply: {token['quantity']}</Text>
                </Box>

                {/* Hide Procure part if NFT is owned by User */}
                {
                  address && address == token.owner && (<>
                    <Box as="span" fontSize="sm">
                      <Text>
                        Fee per NFT:
                        {' ' +
                          token['want']['amount'] * amountOfTokens[token.index] /
                          Math.pow(10, tokenDecimals(token['want']['identifier'])) +
                          ' '}
                        {getTokenWantedRepresentation(
                          token['want']['identifier'],
                          token['want']['nonce']
                        )}
                      </Text>
                    </Box>
                    
                    <HStack>       
                      <Text fontSize='sm'>How many to procure access to </Text>
                      <NumberInput size="xs" maxW={16} step={1} defaultValue={1} min={1} max={token['quantity']} value={amountOfTokens[token.index]} onChange={(valueString) => setAmountOfTokens((oldAmounts:any)=>{
                        const newAmounts = { ...oldAmounts };
                        newAmounts[token.index] = Number(valueString);
                        return newAmounts;
                      })}>
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Button
                        size="xs"
                        colorScheme="teal"
                        width="72px"
                        onClick={() => {
                          setSelectedItem(token);
                          onProcureModalOpen();
                        }}
                      >
                        Procure
                      </Button>
                    </HStack>
                  </>)
                }

                {/* <Button size="xs" mt={3} colorScheme="teal" variant="outline" onClick={() => {
                  if (token['want']['identifier'] === 'EGLD') {
                    contract.sendAcceptOfferEgldTransaction(
                      token['index'],
                      token['want']['amount'],
                      amountOfTokens[token['index']],
                      address
                    );
                  } else {
                    if (token['want']['nonce'] === 0) {
                      contract.sendAcceptOfferEsdtTransaction(
                        token['index'],
                        token['want']['amount'],
                        token['want']['identifier'],
                        amountOfTokens[token['index']],
                        address
                      );
                    } else {
                      contract.sendAcceptOfferNftEsdtTransaction(
                        token['index'],
                        token['want']['amount'],
                        token['want']['identifier'],
                        token['want']['nonce'],
                        amountOfTokens[token['index']],
                        address
                      );
                    }
                  }
                }}>
                  Buy {amountOfTokens[token['index']]} NFT{amountOfTokens[token['index']]>1&&'s'} for {(token['want']['amount'] *
                    amountOfTokens[token['index']]) /
                    Math.pow(
                      10,
                      tokenDecimals(token['want']['identifier'])
                    ) +
                    ' '}
                </Button> */}
              </Flex>

              <Box
                position='absolute'
                top='0'
                bottom='0'
                left='0'
                right='0'
                height='100%'
                width='100%'
                backgroundColor='blackAlpha.800'
                visibility={userData.addressFrozen || (userData.frozenNonces && userData.frozenNonces.includes(token.have.nonce)) ? 'visible' : 'collapse'}
              >
                <Text
                  position='absolute'
                  top='50%'
                  // left='50%'
                  // transform='translate(-50%, -50%)'
                  textAlign='center'
                  fontSize='md'
                  px='2'
                >
                  - FROZEN - <br />
                  Data NFT is under investigation by the DAO as there was a complaint received against it
                </Text>
              </Box>
            </Box>)}
          </Flex>
        }
      </Stack>

      {
        selectedItem && <Modal
          isOpen={isProcureModalOpen}
          onClose={onProcureModalClose}
          closeOnEsc={false} closeOnOverlayClick={false}
        >
          <ModalOverlay
            bg='blackAlpha.700'
            backdropFilter='blur(10px) hue-rotate(90deg)'
          />
          <ModalContent>
            <ModalBody py={6}>
              <Text fontSize='md' mt='4'>How many : 6</Text>
              <Text fontSize='md' mt='4'>Fee per NFT : 60 ITHEUM</Text>
              <Text fontSize='md' mt='4'>Buyer Fee : 2%</Text>
              <Text fontSize='md' mt='4'>Total Fee : 61.2 ITHEUM</Text>

              <Flex justifyContent='end' mt='8 !important'>
                <Button colorScheme="teal" size='sm' mx='3'>Proceed</Button>
                <Button colorScheme="teal" size='sm' variant='outline' onClick={onProcureModalClose}>Cancel</Button>
              </Flex>
            </ModalBody>
          </ModalContent>
        </Modal>
      }
    </>
  );
};

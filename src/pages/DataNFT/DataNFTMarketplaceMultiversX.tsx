import React, { FC, useEffect, useState } from "react";
import { Icon } from "@chakra-ui/icons";
import {
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
  CloseButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  SimpleGrid,
  TabList,
  Tabs,
  Tab,
  useColorMode,
  useToast,
  Box,
  Button,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { TransactionWatcher } from "@multiversx/sdk-core/out";
import { useGetLoginInfo } from "@multiversx/sdk-dapp/hooks/account";
import { useGetAccountInfo } from "@multiversx/sdk-dapp/hooks/account";
import { useGetPendingTransactions } from "@multiversx/sdk-dapp/hooks/transactions";
import { SignedTransactionsBodyType } from "@multiversx/sdk-dapp/types";
import { FaStore, FaBrush } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CustomPagination } from "components/CustomPagination";
import MarketplaceLowerCard from "components/MarketplaceLowerCard";
import MyListedDataLowerCard from "components/MyListedDataLowerCard";
import { NoDataHere } from "components/Sections/NoDataHere";
import UpperCardComponent from "components/UtilComps/UpperCardComponent";
import useThrottle from "components/UtilComps/UseThrottle";
import { getApi, getNetworkProvider, getNftsByIds } from "libs/MultiversX/api";
import { DataNftMarketContract } from "libs/MultiversX/dataNftMarket";
import { DataNftMintContract } from "libs/MultiversX/dataNftMint";
import { DataNftMetadataType, OfferType } from "libs/MultiversX/types";
import { createNftId, sleep, hexZero } from "libs/utils";
import DataNFTDetails from "pages/DataNFT/DataNFTDetails";
import { useMarketStore } from "store";
import { useChainMeta } from "store/ChainMetaContext";

interface PropsType {
  tabState: number; // 1 for "Public Marketplace", 2 for "My Data NFTs"
}

export const Marketplace: FC<PropsType> = ({ tabState }) => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const { isLoggedIn: isMxLoggedIn } = useGetLoginInfo();
  const { pageNumber } = useParams();
  const pageIndex = pageNumber ? Number(pageNumber) : 0;

  const { chainMeta: _chainMeta } = useChainMeta() as any;
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions, pendingTransactions } = useGetPendingTransactions();

  const mintContract = new DataNftMintContract(_chainMeta.networkId);
  const marketContract = new DataNftMarketContract(_chainMeta.networkId);

  const isMarketPaused = useMarketStore((state) => state.isMarketPaused);
  const offers = useMarketStore((state) => state.offers);
  const updateOffers = useMarketStore((state) => state.updateOffers);
  const loadingOffers = useMarketStore((state) => state.loadingOffers);
  const updateLoadingOffers = useMarketStore((state) => state.updateLoadingOffers);
  // pagination
  const pageCount = useMarketStore((state) => state.pageCount);
  const updatePageCount = useMarketStore((state) => state.updatePageCount);

  const pageSize = 8;

  const [nftMetadatas, setNftMetadatas] = useState<DataNftMetadataType[]>([]);
  const [nftMetadatasLoading, setNftMetadatasLoading] = useState<boolean>(false);
  const [oneNFTImgLoaded, setOneNFTImgLoaded] = useState(false);
  const [marketFreezedNonces, setMarketFreezedNonces] = useState<number[]>([]);

  const [offerForDrawer, setOfferForDrawer] = useState<OfferType | undefined>();
  const [myListedDataNFT, setMyListedDataNFT] = useState<number>(0);
  const { isOpen: isDrawerOpenTradeStream, onOpen: onOpenDrawerTradeStream, onClose: onCloseDrawerTradeStream } = useDisclosure();

  const marketplace = "/datanfts/marketplace/market";
  const location = useLocation();

  const setPageIndex = (newPageIndex: number) => {
    navigate(`/datanfts/marketplace/${tabState === 1 ? "market" : "my"}${newPageIndex > 0 ? "/" + newPageIndex : ""}`);
  };

  const onGotoPage = useThrottle((newPageIndex: number) => {
    if (0 <= newPageIndex && newPageIndex < pageCount) {
      setPageIndex(newPageIndex);
    }
  });

  useEffect(() => {
    (async () => {
      if (!_chainMeta.networkId) return;

      const _marketFreezedNonces = await mintContract.getSftsFrozenForAddress(marketContract.dataNftMarketContractAddress);
      setMarketFreezedNonces(_marketFreezedNonces);
    })();
  }, [_chainMeta.networkId]);

  useEffect(() => {
    (async () => {
      if (hasPendingTransactions) return;
      if (!_chainMeta.networkId) return;

      // start loading offers
      updateLoadingOffers(true);

      let _numberOfOffers = 0;
      if (tabState === 1) {
        // global offers
        _numberOfOffers = await marketContract.viewNumberOfOffers();
      } else {
        // offers of User
        _numberOfOffers = await marketContract.viewUserTotalOffers(address);
      }

      console.log("_numberOfOffers", _numberOfOffers);
      const _pageCount = Math.max(1, Math.ceil(_numberOfOffers / pageSize));
      updatePageCount(_pageCount);

      // if pageIndex is out of range
      if (pageIndex >= _pageCount) {
        onGotoPage(0);
      }
    })();
  }, [hasPendingTransactions, tabState, _chainMeta.networkId]);

  useEffect(() => {
    (async () => {
      if (hasPendingTransactions) return;
      if (!_chainMeta.networkId) return;

      // start loading offers
      updateLoadingOffers(true);
      const _offers = await marketContract.viewPagedOffers(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1, tabState === 1 ? "" : address);
      console.log("_offers", _offers);
      updateOffers(_offers);

      //
      setNftMetadatasLoading(true);
      const nftIds = _offers.map((offer) => createNftId(offer.offered_token_identifier, offer.offered_token_nonce));
      const _nfts = await getNftsByIds(nftIds, _chainMeta.networkId);
      const _metadatas: DataNftMetadataType[] = [];
      for (let i = 0; i < _nfts.length; i++) {
        _metadatas.push(mintContract.decodeNftAttributes(_nfts[i], i));
      }
      setNftMetadatas(_metadatas);
      setNftMetadatasLoading(false);

      // end loading offers
      await sleep(0.5);
      updateLoadingOffers(false);
    })();
  }, [pageIndex, pageSize, tabState, hasPendingTransactions]);

  function openNftDetailsDrawer(index: number) {
    setOfferForDrawer(offers[index]);
    onOpenDrawerTradeStream();
  }

  function closeDetailsView() {
    onCloseDrawerTradeStream();
    setOfferForDrawer(undefined);
  }

  //
  const toast = useToast();
  useEffect(() => {
    if (!pendingTransactions) return;

    const networkProvider = getNetworkProvider(_chainMeta.networkId, undefined);
    const watcher = new TransactionWatcher(networkProvider);
    for (const [, value] of Object.entries(pendingTransactions)) {
      const stxs = (value as SignedTransactionsBodyType).transactions;
      if (stxs && stxs.length > 0) {
        (async () => {
          const stx = stxs[0];
          const transactionOnNetwork = await watcher.awaitCompleted({ getHash: () => ({ hex: () => stx.hash }) });
          console.log("transactionOnNetwork", transactionOnNetwork);
          if (transactionOnNetwork.status.isFailed()) {
            for (const event of transactionOnNetwork.logs.events) {
              if (event.identifier == "internalVMErrors") {
                const input = event.data.toString();
                let matches = null;
                try {
                  matches = input.match(/\[([^\][]*)]/g);
                  if (matches) {
                    matches = matches.map((match) => match.slice(1, -1));
                  }
                } catch (e) {
                  console.log(e);
                }
                if (matches) {
                  const title =
                    matches[1] == "acceptOffer"
                      ? "Purchase transaction failed"
                      : matches[1] == "cancelOffer"
                      ? "De-List transaction failed"
                      : matches[1] == "changeOfferPrice"
                      ? "Update price transaction failed"
                      : "Transaction failed";
                  const description = matches[matches.length - 1];

                  toast({
                    title,
                    description,
                    status: "error",
                    duration: 9000,
                    isClosable: true,
                  });

                  return;
                }
              }
            }
          }
        })();
      }
    }
  }, [pendingTransactions]);

  return (
    <>
      <Stack>
        <Heading size="xl" fontWeight="medium" mt={10} mx={{ base: 10, lg: 24 }} textAlign={{ base: "center", lg: "start" }}>
          Data NFT Marketplace
        </Heading>
        <Heading size="1rem" opacity=".7" fontWeight="light" px={{ base: 10, lg: 24 }} textAlign={{ base: "center", lg: "start" }}>
          Explore and discover new Data NFTs direct from Data Creators and peer-to-peer traders
        </Heading>

        <Box position="relative">
          <Tabs pt={10}>
            <TabList justifyContent={{ base: "start", lg: "space-between" }} overflow={{ base: "scroll", md: "unset", lg: "unset" }}>
              <Flex>
                <Tab
                  _selected={{ borderBottom: "5px solid", borderBottomColor: "teal.200" }}
                  flexDirection="row"
                  _disabled={{ opacity: 1 }}
                  fontSize={{ base: "sm", md: "md" }}
                  onClick={() => {
                    if (hasPendingTransactions) return;
                    navigate("/datanfts/marketplace/market");
                  }}>
                  <Flex ml="4.7rem" alignItems="center" py={3}>
                    <Icon as={FaStore} mx={2} size="0.95rem" textColor={colorMode === "dark" ? "white" : "black"} />
                    <Text fontSize="lg" fontWeight="medium" color={colorMode === "dark" ? "white" : "black"}>
                      Public Marketplace
                    </Text>
                  </Flex>
                </Tab>
                <Tab
                  _selected={{ borderBottom: "5px solid", borderBottomColor: "teal.200" }}
                  _disabled={{ opacity: 1 }}
                  fontSize={{ base: "sm", md: "md" }}
                  onClick={() => {
                    if (hasPendingTransactions) return;
                    navigate("/datanfts/marketplace/my");
                  }}>
                  {isMxLoggedIn && (
                    <Flex ml="4.7rem" alignItems="center" py={3}>
                      <Icon as={FaBrush} size="0.95rem" mx={2} textColor={colorMode === "dark" ? "white" : "black"} />
                      <Text fontSize="lg" fontWeight="medium" color={colorMode === "dark" ? "white" : "black"}>
                        My Listed Data NFT(s)
                      </Text>
                      <Text fontSize="sm" px={1} color="whiteAlpha.800">
                        {myListedDataNFT > 0 && myListedDataNFT}
                      </Text>
                    </Flex>
                  )}
                </Tab>
              </Flex>
              <Flex mr="4.7rem">
                <CustomPagination pageCount={pageCount} pageIndex={pageIndex} pageSize={pageSize} gotoPage={onGotoPage} disabled={hasPendingTransactions} />
              </Flex>
            </TabList>

            <TabPanels>
              <TabPanel mt={2} width={"full"}>
                {!loadingOffers && !nftMetadatasLoading && offers.length === 0 ? (
                  <NoDataHere />
                ) : (
                  <SimpleGrid
                    columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                    spacingY={4}
                    mx={{ base: 0, "2xl": "24 !important" }}
                    mt="5 !important"
                    justifyItems={"center"}>
                    {offers.length > 0 &&
                      offers.map((offer, index) => (
                        <UpperCardComponent
                          key={index}
                          nftImageLoading={oneNFTImgLoaded && !loadingOffers}
                          imageUrl={`https://${getApi(_chainMeta.networkId)}/nfts/${offer?.offered_token_identifier}-${hexZero(
                            offer?.offered_token_nonce
                          )}/thumbnail`}
                          setNftImageLoaded={setOneNFTImgLoaded}
                          nftMetadata={nftMetadatas[index]}
                          offer={offer}
                          index={index}
                          marketFreezedNonces={marketFreezedNonces}
                          openNftDetailsDrawer={openNftDetailsDrawer}>
                          <MarketplaceLowerCard nftMetadata={nftMetadatas[index]} offer={offer} />
                        </UpperCardComponent>
                      ))}
                  </SimpleGrid>
                )}
              </TabPanel>
              <TabPanel mt={2} width={"full"}>
                {!loadingOffers && !nftMetadatasLoading && offers.length === 0 ? (
                  <NoDataHere />
                ) : (
                  <SimpleGrid
                    columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                    spacingY={4}
                    mx={{ base: 0, "2xl": "24 !important" }}
                    mt="5 !important"
                    justifyItems={"center"}>
                    {offers.length > 0 &&
                      offers.map((offer, index) => (
                        <UpperCardComponent
                          key={index}
                          nftImageLoading={oneNFTImgLoaded && !loadingOffers}
                          imageUrl={`https://${getApi(_chainMeta.networkId)}/nfts/${offer?.offered_token_identifier}-${hexZero(
                            offer?.offered_token_nonce
                          )}/thumbnail`}
                          setNftImageLoaded={setOneNFTImgLoaded}
                          nftMetadata={nftMetadatas[index]}
                          offer={offer}
                          index={index}
                          marketFreezedNonces={marketFreezedNonces}
                          openNftDetailsDrawer={openNftDetailsDrawer}>
                          <MyListedDataLowerCard offer={offer} nftMetadata={nftMetadatas[index]} />
                        </UpperCardComponent>
                      ))}
                  </SimpleGrid>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
          {
            /* show bottom pagination only if offers exist */
            offers.length > 0 && (
              <Flex justifyContent={{ base: "center", md: "center" }} py="5">
                <CustomPagination pageCount={pageCount} pageIndex={pageIndex} pageSize={pageSize} gotoPage={onGotoPage} disabled={hasPendingTransactions} />
              </Flex>
            )
          }

          <Box
            position="absolute"
            top="0"
            bottom="0"
            left="0"
            right="0"
            height="100%"
            width="100%"
            backgroundColor="blackAlpha.700"
            backdropFilter="auto"
            backdropBlur="4px"
            rounded="lg"
            visibility={isMarketPaused ? "visible" : "collapse"}
            verticalAlign="middle"
            borderTop="solid .1rem"
            borderColor="teal.200">
            <Box top="20vh" position="relative" textAlign="center" fontSize="24px" fontWeight="500" lineHeight="38px" textColor="teal.200">
              - Marketplace is PAUSED -
              <Text fontSize="16px" fontWeight="400" textColor="white" lineHeight="25px" px={3}>
                Data NFT Marketplace is currently paused. Please check back later.
              </Text>
            </Box>
          </Box>
        </Box>
      </Stack>

      {offerForDrawer && (
        <>
          <Drawer onClose={closeDetailsView} isOpen={isDrawerOpenTradeStream} size="xl" closeOnEsc={false} closeOnOverlayClick={true}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerHeader bgColor="#181818">
                <HStack spacing="5">
                  <CloseButton size="lg" onClick={closeDetailsView} />
                  <Heading as="h4" size="lg">
                    Data NFT Details
                  </Heading>
                </HStack>
              </DrawerHeader>
              <DrawerBody bgColor="#181818">
                <DataNFTDetails
                  tokenIdProp={createNftId(offerForDrawer.offered_token_identifier, offerForDrawer.offered_token_nonce)}
                  offerIdProp={offerForDrawer.index}
                  closeDetailsView={closeDetailsView}
                />
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </>
  );
};

export default Marketplace;
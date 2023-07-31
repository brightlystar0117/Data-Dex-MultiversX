import React, { FC, useEffect, useState } from "react";
import { Icon } from "@chakra-ui/icons";
import {
  Box,
  CloseButton,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorMode,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { TransactionWatcher } from "@multiversx/sdk-core/out";
import { useGetAccountInfo, useGetLoginInfo } from "@multiversx/sdk-dapp/hooks/account";
import { useGetPendingTransactions } from "@multiversx/sdk-dapp/hooks/transactions";
import { SignedTransactionsBodyType } from "@multiversx/sdk-dapp/types";
import { FaBrush, FaStore } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CustomPagination } from "components/CustomPagination";
import MarketplaceLowerCard from "components/MarketplaceLowerCard";
import MyListedDataLowerCard from "components/MyListedDataLowerCard";
import { NoDataHere } from "components/Sections/NoDataHere";
import ConditionalRender from "components/UtilComps/ApiWrapper";
import UpperCardComponent from "components/UtilComps/UpperCardComponent";
import useThrottle from "components/UtilComps/UseThrottle";
import { getOffersCountFromBackendApi, getOffersFromBackendApi } from "libs/MultiversX";
import { getApi, getNetworkProvider, getNftsByIds } from "libs/MultiversX/api";
import { DataNftMarketContract } from "libs/MultiversX/dataNftMarket";
import { DataNftMintContract } from "libs/MultiversX/dataNftMint";
import { DataNftMetadataType, OfferType } from "libs/MultiversX/types";
import { createNftId, hexZero, sleep } from "libs/utils";
import { routeChainIDBasedOnLoggedInStatus } from "libs/utils/util";
import DataNFTDetails from "pages/DataNFT/DataNFTDetails";
import { useMarketStore } from "store";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/hooks";

interface PropsType {
  tabState: number; // 1 for "Public Marketplace", 2 for "My Data NFTs"
}

export const Marketplace: FC<PropsType> = ({ tabState }) => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const { isLoggedIn: isMxLoggedIn } = useGetLoginInfo();
  const { pageNumber } = useParams();
  const pageIndex = pageNumber ? Number(pageNumber) : 0;

  const { chainID } = useGetNetworkConfig();
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions, pendingTransactions } = useGetPendingTransactions();

  const routedChainID = routeChainIDBasedOnLoggedInStatus(isMxLoggedIn, chainID);

  console.log("DATA NFT MARKETPLACE : chainID", chainID);
  console.log("DATA NFT MARKETPLACE : isMxLoggedIn", isMxLoggedIn);
  console.log("DATA NFT MARKETPLACE : routedChainID", routedChainID);

  const mintContract = new DataNftMintContract(routedChainID);
  const marketContract = new DataNftMarketContract(routedChainID);

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

  const isApiUp = useMarketStore((state) => state.isApiUp);

  const [offerForDrawer, setOfferForDrawer] = useState<OfferType | undefined>();
  const { isOpen: isOpenDataNftDetails, onOpen: onOpenDataNftDetails, onClose: onCloseDataNftDetails } = useDisclosure();
  const [myListedCount, setMyListedCount] = useState<number>(0);
  const [publicMarketCount, setPublicMarketCount] = useState<number>(0);

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
      const _marketFreezedNonces = await mintContract.getSftsFrozenForAddress(marketContract.dataNftMarketContractAddress);
      setMarketFreezedNonces(_marketFreezedNonces);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (hasPendingTransactions) return;

      if (isApiUp) {
        const publicCount = await getOffersCountFromBackendApi(routedChainID);
        const listedCount = await getOffersCountFromBackendApi(routedChainID, address);

        setMyListedCount(listedCount);
        setPublicMarketCount(publicCount);
      }

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

      // console.log("_numberOfOffers", _numberOfOffers);
      const _pageCount = Math.max(1, Math.ceil(_numberOfOffers / pageSize));
      updatePageCount(_pageCount);

      // if pageIndex is out of range
      if (pageIndex >= _pageCount) {
        onGotoPage(0);
      }
    })();
  }, [hasPendingTransactions, tabState]);

  useEffect(() => {
    (async () => {
      if (hasPendingTransactions) return;

      // start loading offers
      updateLoadingOffers(true);

      let _offers: OfferType[] = [];
      const start = pageIndex * pageSize;
      if (isApiUp) {
        // console.log('Api Up');
        _offers = await getOffersFromBackendApi(routedChainID, start, pageSize, tabState === 1 ? undefined : address);
      } else {
        // console.log('Api Down');
        _offers = await marketContract.viewPagedOffers(start, start + pageSize - 1, tabState === 1 ? "" : address);
      }

      // console.log("_offers", _offers);
      updateOffers(_offers);

      setNftMetadatasLoading(true);
      const nftIds = _offers.map((offer) => createNftId(offer.offered_token_identifier, offer.offered_token_nonce));
      const _nfts = await getNftsByIds(nftIds, routedChainID);
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
  }, [pageIndex, tabState, hasPendingTransactions]);

  function openNftDetailsModal(index: number) {
    setOfferForDrawer(offers[index]);
    onOpenDataNftDetails();
  }

  function closeDetailsView() {
    onCloseDataNftDetails();
    setOfferForDrawer(undefined);
  }

  const toast = useToast();
  useEffect(() => {
    if (!pendingTransactions) return;

    const networkProvider = getNetworkProvider(routedChainID);
    const watcher = new TransactionWatcher(networkProvider);
    for (const [, value] of Object.entries(pendingTransactions)) {
      const stxs = (value as SignedTransactionsBodyType).transactions;
      if (stxs && stxs.length > 0) {
        (async () => {
          const stx = stxs[0];
          const transactionOnNetwork = await watcher.awaitCompleted({ getHash: () => ({ hex: () => stx.hash }) });
          // console.log("transactionOnNetwork", transactionOnNetwork);
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
            <TabList justifyContent={{ base: "start", lg: "space-between" }} overflowX={{ base: "scroll", md: "scroll", lg: "unset" }} overflowY="hidden">
              <Flex>
                <Tab
                  _selected={{ borderBottom: "5px solid", borderBottomColor: "teal.200" }}
                  flexDirection="row"
                  _disabled={{ opacity: 1 }}
                  p={{ base: "0", md: "initial" }}
                  fontSize={{ base: "sm", md: "md" }}
                  onClick={() => {
                    if (hasPendingTransactions) return;
                    navigate("/datanfts/marketplace/market");
                  }}>
                  <Flex ml={{ base: "0.5rem", md: "4.7rem" }} alignItems="center" py={3}>
                    <Icon as={FaStore} mx={2} size="0.95rem" textColor={colorMode === "dark" ? "white" : "black"} />
                    <ConditionalRender
                      fallback={
                        <>
                          <Text fontSize="lg" fontWeight="medium" w="max-content" color={colorMode === "dark" ? "white" : "black"}>
                            Public Marketplace
                          </Text>
                        </>
                      }
                      checkFunction={isApiUp}>
                      <Text fontSize="lg" fontWeight="medium" w="max-content" color={colorMode === "dark" ? "white" : "black"}>
                        Public Marketplace
                      </Text>
                      <Text fontSize="sm" px={1} color="whiteAlpha.800">
                        {publicMarketCount > 0 && publicMarketCount}
                      </Text>
                    </ConditionalRender>
                  </Flex>
                </Tab>
                <Tab
                  _selected={{ borderBottom: "5px solid", borderBottomColor: "teal.200" }}
                  _disabled={{ opacity: 1 }}
                  p={{ base: "0", md: "initial" }}
                  fontSize={{ base: "sm", md: "md" }}
                  onClick={() => {
                    if (hasPendingTransactions) return;
                    navigate("/datanfts/marketplace/my");
                  }}>
                  {isMxLoggedIn && (
                    <Flex ml={{ base: "0.5rem", md: "4.7rem" }} alignItems="center" py={3}>
                      <Icon as={FaBrush} size="0.95rem" mx={2} textColor={colorMode === "dark" ? "white" : "black"} />
                      <ConditionalRender
                        fallback={
                          <>
                            <Text fontSize="lg" fontWeight="medium" color={colorMode === "dark" ? "white" : "black"} w="max-content">
                              My Listed Data NFT(s)
                            </Text>
                          </>
                        }
                        checkFunction={isApiUp}>
                        <Text fontSize="lg" fontWeight="medium" color={colorMode === "dark" ? "white" : "black"} w="max-content">
                          My Listed Data NFT(s)
                        </Text>
                        <Text fontSize="sm" px={1} color="whiteAlpha.800">
                          {myListedCount > 0 && myListedCount}
                        </Text>
                      </ConditionalRender>
                    </Flex>
                  )}
                </Tab>
              </Flex>
              <Flex pr={{ lg: "10" }} ml={{ base: "0.8rem", xl: 0 }} pb={1}>
                <CustomPagination pageCount={pageCount} pageIndex={pageIndex} gotoPage={onGotoPage} disabled={hasPendingTransactions} />
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
                          imageUrl={`https://${getApi(routedChainID)}/nfts/${offer?.offered_token_identifier}-${hexZero(offer?.offered_token_nonce)}/thumbnail`}
                          setNftImageLoaded={setOneNFTImgLoaded}
                          nftMetadata={nftMetadatas[index]}
                          offer={offer}
                          index={index}
                          marketFreezedNonces={marketFreezedNonces}
                          openNftDetailsDrawer={openNftDetailsModal}>
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
                          imageUrl={`https://${getApi(routedChainID)}/nfts/${offer?.offered_token_identifier}-${hexZero(offer?.offered_token_nonce)}/thumbnail`}
                          setNftImageLoaded={setOneNFTImgLoaded}
                          nftMetadata={nftMetadatas[index]}
                          offer={offer}
                          index={index}
                          marketFreezedNonces={marketFreezedNonces}
                          openNftDetailsDrawer={openNftDetailsModal}>
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
                <CustomPagination pageCount={pageCount} pageIndex={pageIndex} gotoPage={onGotoPage} disabled={hasPendingTransactions} />
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
            borderColor="teal.200"
            backgroundImage={
              colorMode === "dark" ? "linear-gradient(to bottom, rgba(255,0,0,0), rgb(15 15 15))" : "linear-gradient(to bottom, rgba(255,0,0,0), #F5F5F5)"
            }>
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
          <Modal onClose={onCloseDataNftDetails} isOpen={isOpenDataNftDetails} size="6xl" closeOnEsc={false} closeOnOverlayClick={true}>
            <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(15px)" />
            <ModalContent overflowY="scroll" h="90%">
              <ModalHeader bgColor={colorMode === "dark" ? "#181818" : "bgWhite"}>
                <HStack spacing="5">
                  <CloseButton size="lg" onClick={closeDetailsView} />
                  <Heading as="h4" size="lg">
                    Data NFT Details
                  </Heading>
                </HStack>
              </ModalHeader>
              <ModalBody bgColor={colorMode === "dark" ? "#181818" : "bgWhite"}>
                <DataNFTDetails
                  tokenIdProp={createNftId(offerForDrawer.offered_token_identifier, offerForDrawer.offered_token_nonce)}
                  offerIdProp={offerForDrawer.index}
                  closeDetailsView={closeDetailsView}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
};

export default Marketplace;

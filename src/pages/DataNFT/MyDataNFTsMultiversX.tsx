import React, { useEffect, useState } from "react";
import { Icon } from "@chakra-ui/icons";
import {
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
} from "@chakra-ui/react";
import { AbiRegistry, BinaryCodec } from "@multiversx/sdk-core/out";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/hooks";
import { useGetAccountInfo, useGetLoginInfo } from "@multiversx/sdk-dapp/hooks/account";
import { useGetPendingTransactions } from "@multiversx/sdk-dapp/hooks/transactions";
import { BsClockHistory } from "react-icons/bs";
import { FaBrush } from "react-icons/fa";
import { MdFavoriteBorder, MdOutlineShoppingBag } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { NoDataHere } from "components/Sections/NoDataHere";
import InteractionTxTable from "components/Tables/InteractionTxTable";
import useThrottle from "components/UtilComps/UseThrottle";
import WalletDataNFTMX from "components/WalletDataNFTMX/WalletDataNFTMX";
import { contractsForChain } from "libs/config";
import dataNftMintJson from "libs/MultiversX/ABIs/datanftmint.abi.json";
import { getNftsOfACollectionForAnAddress } from "libs/MultiversX/api";
import { createDataNftType, DataNftType } from "libs/MultiversX/types";
import DataNFTDetails from "pages/DataNFT/DataNFTDetails";
import { useMarketStore } from "store";
import { FavoriteCards } from "./components/FavoriteCards";

export default function MyDataNFTsMx({ tabState }: { tabState: number }) {
  const { colorMode } = useColorMode();
  const { chainID } = useGetNetworkConfig();
  const itheumToken = contractsForChain(chainID).itheumToken;
  const { address } = useGetAccountInfo();
  const navigate = useNavigate();

  const marketRequirements = useMarketStore((state) => state.marketRequirements);
  // const userData = useMintStore((state) => state.userData);
  const maxPaymentFeeMap = useMarketStore((state) => state.maxPaymentFeeMap);

  const [dataNfts, setDataNfts] = useState<DataNftType[]>(() => {
    const _dataNfts: DataNftType[] = [];
    for (let index = 0; index < 8; index++) {
      _dataNfts.push(createDataNftType());
    }
    return _dataNfts;
  });
  const purchasedDataNfts: DataNftType[] = dataNfts.filter((item) => item.creator != address);
  const [oneNFTImgLoaded, setOneNFTImgLoaded] = useState(false);
  const { hasPendingTransactions } = useGetPendingTransactions();

  const [nftForDrawer, setNftForDrawer] = useState<DataNftType | undefined>();
  const { isOpen: isOpenDataNftDetails, onOpen: onOpenDataNftDetails, onClose: onCloseDataNftDetails } = useDisclosure();

  const onChangeTab = useThrottle((newTabState: number) => {
    navigate(`/datanfts/wallet${newTabState === 2 ? "/purchased" : newTabState === 4 ? "/activity" : newTabState === 3 ? "/favorite" : ""}`);
  }, /* delay: */ 500);

  const walletTabs = [
    {
      tabName: "Your Data NFT(s)",
      icon: FaBrush,
      isDisabled: false,
      pieces: dataNfts.length,
    },
    {
      tabName: "Purchased",
      icon: MdOutlineShoppingBag,
      isDisabled: false,
      pieces: purchasedDataNfts.length,
    },
    {
      tabName: "Favorite",
      icon: MdFavoriteBorder,
      isDisabled: false,
    },
    {
      tabName: "Activity",
      icon: BsClockHistory,
      isDisabled: false,
    },
    // {
    //   tabName: "Offers",
    //   icon: MdOutlineLocalOffer,
    //   isDisabled: true,
    // },
  ];

  const getOnChainNFTs = async () => {
    const onChainNfts = await getNftsOfACollectionForAnAddress(
      address,
      contractsForChain(chainID).dataNftTokens.map((v) => v.id),
      chainID
    );

    if (onChainNfts.length > 0) {
      const codec = new BinaryCodec();
      const json = JSON.parse(JSON.stringify(dataNftMintJson));
      const abiRegistry = AbiRegistry.create(json);
      const dataNftAttributes = abiRegistry.getStruct("DataNftAttributes");

      // some logic to loop through the raw onChainNFTs and build the dataNfts
      const _dataNfts: DataNftType[] = [];

      for (let index = 0; index < onChainNfts.length; index++) {
        const decodedAttributes = codec.decodeTopLevel(Buffer.from(onChainNfts[index].attributes, "base64"), dataNftAttributes).valueOf();
        const nft = onChainNfts[index];

        _dataNfts.push({
          index, // only for view & query
          id: nft.identifier, // ID of NFT -> done
          nftImgUrl: nft.url ? nft.url : "", // image URL of of NFT -> done
          dataPreview: decodedAttributes["data_preview_url"].toString(), // preview URL for NFT data stream -> done
          dataStream: decodedAttributes["data_stream_url"].toString(), // data stream URL -> done
          dataMarshal: decodedAttributes["data_marshal_url"].toString(), // data stream URL -> done
          tokenName: nft.name, // is this different to NFT ID? -> yes, name can be chosen by the user
          feeInTokens: 100, // how much in ITHEUM tokens => should not appear here as it's in the wallet, not on the market
          creator: decodedAttributes["creator"].toString(), // initial creator of NFT
          creationTime: new Date(Number(decodedAttributes["creation_time"]) * 1000), // initial creation time of NFT
          supply: nft.supply ? Number(nft.supply) : 1,
          balance: nft.balance !== undefined ? Number(nft.balance) : 1,
          description: decodedAttributes["description"].toString(),
          title: decodedAttributes["title"].toString(),
          royalties: nft.royalties / 100,
          nonce: nft.nonce,
          collection: nft.collection,
        });
      }
      setDataNfts(_dataNfts);
    } else {
      // await sleep(4);
      setDataNfts([]);
    }
  };

  useEffect(() => {
    if (hasPendingTransactions) return;

    getOnChainNFTs();
  }, [hasPendingTransactions]);

  function openNftDetailsDrawer(index: number) {
    setNftForDrawer(dataNfts[index]);
    onOpenDataNftDetails();
  }

  function closeDetailsView() {
    onCloseDataNftDetails();
    setNftForDrawer(undefined);
  }

  return (
    <>
      <Stack>
        <Heading size="xl" fontFamily="Clash-Medium" mt={10} mx={{ base: 10, lg: 24 }} textAlign={{ base: "center", lg: "start" }}>
          Data NFT Wallet
        </Heading>
        <Heading size="1rem" opacity=".7" fontFamily="Satoshi-Medium" fontWeight="light" px={{ base: 10, lg: 24 }} textAlign={{ base: "center", lg: "start" }}>
          Below are the Data NFTs you created or purchased from the peer-to-peer Data NFT Marketplace
        </Heading>

        <Tabs pt={10} index={tabState - 1}>
          <TabList overflowX={{ base: "scroll", md: "scroll", xl: "unset", "2xl": "unset" }} maxW="100%" overflowY="hidden">
            {walletTabs.map((tab, index) => {
              return (
                <Tab
                  key={index}
                  isDisabled={tab.isDisabled}
                  p={{ base: "0", md: "initial" }}
                  _selected={{ borderBottom: "5px solid", borderBottomColor: "teal.200" }}
                  onClick={() => onChangeTab(index + 1)}>
                  <Flex ml={{ base: "0.5rem", md: "4.7rem" }} alignItems="center" py={3} overflow="hidden">
                    <Icon as={tab.icon} mx={2} size="0.95rem" textColor={colorMode === "dark" ? "white" : "black"} />
                    <Text fontSize="lg" fontWeight="medium" color={colorMode === "dark" ? "white" : "black"} w="max-content">
                      {tab.tabName}
                    </Text>
                    <Text fontSize="sm" px={2} color={colorMode == "dark" ? "whiteAlpha.800" : "blackAlpha.800"}>
                      {tab.pieces}
                    </Text>
                  </Flex>
                </Tab>
              );
            })}
          </TabList>
          <TabPanels>
            <TabPanel mt={2} width={"full"}>
              {tabState === 1 && dataNfts.length > 0 ? (
                <SimpleGrid
                  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                  spacingY={4}
                  mx={{ base: 0, "2xl": "24 !important" }}
                  mt="5 !important"
                  justifyItems={"center"}>
                  {dataNfts.map((item, index) => (
                    <WalletDataNFTMX
                      key={index}
                      hasLoaded={oneNFTImgLoaded}
                      setHasLoaded={setOneNFTImgLoaded}
                      maxPayment={maxPaymentFeeMap[itheumToken]}
                      sellerFee={marketRequirements ? marketRequirements.sellerTaxPercentage : 0}
                      openNftDetailsDrawer={openNftDetailsDrawer}
                      isProfile={false}
                      {...item}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Flex onClick={getOnChainNFTs}>
                  <NoDataHere />
                </Flex>
              )}
            </TabPanel>
            <TabPanel mt={2} width={"full"}>
              {tabState === 2 && purchasedDataNfts.length >= 0 ? (
                <SimpleGrid
                  columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                  spacingY={4}
                  mx={{ base: 0, "2xl": "24 !important" }}
                  mt="5 !important"
                  justifyItems={"center"}>
                  {purchasedDataNfts.map((item, index) => (
                    <WalletDataNFTMX
                      key={index}
                      hasLoaded={oneNFTImgLoaded}
                      setHasLoaded={setOneNFTImgLoaded}
                      maxPayment={maxPaymentFeeMap[itheumToken]}
                      sellerFee={marketRequirements ? marketRequirements.sellerTaxPercentage : 0}
                      openNftDetailsDrawer={openNftDetailsDrawer}
                      isProfile={false}
                      {...item}
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Flex onClick={getOnChainNFTs}>
                  <NoDataHere />
                </Flex>
              )}
            </TabPanel>
            <TabPanel mt={2} width={"full"}>
              {tabState === 3 ? (
                <FavoriteCards />
              ) : (
                <Flex onClick={getOnChainNFTs}>
                  <NoDataHere />
                </Flex>
              )}
            </TabPanel>
            <TabPanel>
              <InteractionTxTable address={address} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
      {nftForDrawer && (
        <>
          <Modal onClose={closeDetailsView} isOpen={isOpenDataNftDetails} size="6xl" closeOnEsc={false} closeOnOverlayClick={true}>
            <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(15px)" />
            <ModalContent bgColor={colorMode === "dark" ? "#181818" : "bgWhite"} overflowY="scroll" h="90%">
              <ModalHeader paddingBottom={0} bgColor={colorMode === "dark" ? "#181818" : "bgWhite"}>
                <HStack spacing="5">
                  <CloseButton size="lg" onClick={closeDetailsView} />
                </HStack>
                <Text fontSize="32px" fontFamily="Clash-Medium" mt={3} fontWeight="500" textAlign="center">
                  Data NFT Details
                </Text>
              </ModalHeader>
              <ModalBody bgColor={colorMode === "dark" ? "#181818" : "bgWhite"}>
                <DataNFTDetails tokenIdProp={nftForDrawer.id} closeDetailsView={closeDetailsView} />
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}

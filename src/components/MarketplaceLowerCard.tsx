import React, { FC, useState } from "react";
import {
  Button,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  useDisclosure,
  useColorMode,
  Flex,
  Box,
  Tooltip,
} from "@chakra-ui/react";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/hooks";
import { useGetAccountInfo, useGetLoginInfo } from "@multiversx/sdk-dapp/hooks/account";
import { useGetPendingTransactions } from "@multiversx/sdk-dapp/hooks/transactions";
import ProcureDataNFTModal from "components/ProcureDataNFTModal";
import ExploreAppButton from "components/UtilComps/ExploreAppButton";
import { PREVIEW_DATA_ON_DEVNET_SESSION_KEY } from "libs/config";
import { useLocalStorage } from "libs/hooks";
import { DataNftMetadataType, OfferType } from "libs/MultiversX/types";
import { isValidNumericCharacter, shouldPreviewDataBeEnabled, viewDataDisabledMessage } from "libs/utils";
import { useMarketStore } from "store";
import PreviewDataButton from "./PreviewDataButton";

type MarketplaceLowerCardProps = {
  offer: OfferType;
  nftMetadata: DataNftMetadataType;
};

const MarketplaceLowerCard: FC<MarketplaceLowerCardProps> = ({ offer, nftMetadata }) => {
  const { chainID } = useGetNetworkConfig();
  const { loginMethod, isLoggedIn: isMxLoggedIn } = useGetLoginInfo();
  const { colorMode } = useColorMode();
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const marketRequirements = useMarketStore((state) => state.marketRequirements);

  const [amount, setAmount] = useState<number>(1);
  const [amountError, setAmountError] = useState<string>("");
  const { isOpen: isProcureModalOpen, onOpen: onProcureModalOpen, onClose: onProcureModalClose } = useDisclosure();
  const isMyNft = offer.owner === address;
  const maxBuyLimit = process.env.REACT_APP_MAX_BUY_LIMIT_PER_SFT ? Number(process.env.REACT_APP_MAX_BUY_LIMIT_PER_SFT) : 0;
  const maxBuyNumber = maxBuyLimit > 0 ? Math.min(maxBuyLimit, offer.quantity) : offer.quantity;
  return (
    <>
      <HStack justifyContent="stretch">
        <PreviewDataButton previewDataURL={nftMetadata.dataPreview} />

        <ExploreAppButton nonce={offer.offered_token_nonce} />
      </HStack>

      {!isMyNft ? (
        isMxLoggedIn && (
          <HStack>
            <Flex flexDirection="row">
              <Box>
                <Text fontSize="md" mb="1">
                  Amount{" "}
                </Text>
                <NumberInput
                  size="md"
                  maxW="24"
                  step={1}
                  min={1}
                  max={maxBuyNumber}
                  isValidCharacter={isValidNumericCharacter}
                  value={amount}
                  defaultValue={1}
                  onChange={(valueAsString) => {
                    const value = Number(valueAsString);
                    let error = "";
                    if (value <= 0) {
                      error = "Cannot be zero or negative";
                    } else if (value > offer.quantity) {
                      error = "Cannot exceed listed amount";
                    } else if (maxBuyLimit > 0 && value > maxBuyLimit) {
                      error = "Cannot exceed max buy limit";
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
              </Box>
              <Button
                size="sm"
                colorScheme="teal"
                mt="7"
                ml="4"
                isDisabled={hasPendingTransactions || !!amountError}
                onClick={() => {
                  onProcureModalOpen();
                }}>
                Purchase Data
              </Button>
            </Flex>
          </HStack>
        )
      ) : (
        <HStack h="3rem"></HStack>
      )}

      {!!amountError && (
        <Text color="red.400" fontSize="xs" mt={1}>
          {amountError}
        </Text>
      )}

      {nftMetadata && (
        <ProcureDataNFTModal
          isOpen={isProcureModalOpen}
          onClose={onProcureModalClose}
          buyerFee={marketRequirements.buyerTaxPercentage || 0}
          nftData={nftMetadata}
          offer={offer}
          amount={amount}
        />
      )}
    </>
  );
};

export default MarketplaceLowerCard;

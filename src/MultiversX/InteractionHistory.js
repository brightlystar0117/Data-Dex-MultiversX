import React, { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useBreakpointValue } from "@chakra-ui/react";
import { useChainMeta } from "store/ChainMetaContext";
import InteractionTxTable from "Tables/InteractionTxTable";

export default function InteractionsHistory({ mxAddress, networkId, onAfterCloseInteractionsHistory }) {
  const [interactionTransactionsModalOpen, setInteractionTransactionsModalOpen] = useState(true);
  const { chainMeta: _chainMeta } = useChainMeta();

  const modelSize = useBreakpointValue({ base: "xs", md: "xl" });

  return (
    <Modal
      isOpen={interactionTransactionsModalOpen}
      onClose={() => {
        onAfterCloseInteractionsHistory();
        setInteractionTransactionsModalOpen(false);
      }}
      scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxWidth={{ md: "70vw" }} maxHeight={{ md: "90vh" }}>
        <ModalHeader>Recent Claim Transactions</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <InteractionTxTable address={mxAddress} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

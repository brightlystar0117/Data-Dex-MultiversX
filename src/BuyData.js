import React, {useState} from 'react';
import { useMoralis, useMoralisQuery, useNewMoralisObject } from 'react-moralis';
import { Box, Stack } from '@chakra-ui/layout';
import {
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  CloseButton,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableCaption,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl, FormLabel, Input, Text,
  useToast,
  useDisclosure
} from '@chakra-ui/react';

import { dataTemplates } from './util';

export default function() {
  const toast = useToast();
  const { user } = useMoralis();
  const { data: dataPacks, error: errorDataPackGet, isLoading } = useMoralisQuery("DataPack");
  const { isSaving, error: errorOrderSave, save: saveDataOrder } = useNewMoralisObject('DataOrder');
  const [reasonToBuy, setReasonToBuy] = useState('');
  const [currBuyObjectId, setCurrBuyObjectId] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const initialRef = React.useRef()

  function askForReason(objectId) {
    setCurrBuyObjectId(objectId);
    onOpen();
  }

  async function requestToBuy() {
    if (reasonToBuy.trim() === '') {
      alert('You need to provide a reason to buy this');
    } else {
      const dataPack = dataPacks.find(item => item.id === currBuyObjectId);

      // create the object
      const newDataOrder = {...dataTemplates.dataOrder, 
        state: '1',
        reasonToBuy: reasonToBuy,
        dataPackId: dataPack.id,
        sellerEthAddress: dataPack.get('sellerEthAddress'),
        buyerEthAddress: user.get('ethAddress')
      };

      await saveDataOrder(newDataOrder);

      toast({
        title: "Data order placed - seller needs to approve",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      onCloseCleanUp();


      // const order = dataPacks.find(item => item.id === currBuyObjectId);
      // order.set("state", "2");
      // order.set("reasonToBuy", reasonToBuy);

      // await order.save();

      // toast({
      //   title: "Buy order placed - seller needs to approve",
      //   status: "success",
      //   duration: 4000,
      //   isClosable: true,
      // });

      // onCloseCleanUp();
    }
  }

  function onCloseCleanUp() {
    setCurrBuyObjectId(null);
    setReasonToBuy('');
    onClose();
  }

  return (
    <Stack spacing={5}>
      <Box></Box>
      {errorDataPackGet && 
        <Alert status="error">
          <Box flex="1">
            <AlertIcon />
            <AlertTitle>{errorDataPackGet.message}</AlertTitle>
          </Box>
          <CloseButton position="absolute" right="8px" top="8px" />
        </Alert>
      }
      {errorOrderSave && 
        <Alert status="error">
          <Box flex="1">
            <AlertIcon />
            <AlertTitle>{errorOrderSave.message}</AlertTitle>
          </Box>
          <CloseButton position="absolute" right="8px" top="8px" />
        </Alert>
      }
      {(isLoading || dataPacks.length === 0) && <Stack>
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
      </Stack> || 
        <Box>
          <Table variant="simple">
            <TableCaption>THe following data packs are available for purchase</TableCaption>
            <Thead>
              <Tr>
                <Th>Data Pack ID</Th>
                <Th>Seller Address</Th>
                <Th>Data Preview</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {dataPacks.map((item) => <Tr key={item.id}>
                <Td>{item.id}</Td>
                <Td>{item.get('sellerEthAddress')}</Td>
                <Td>{item.get('dataPreview')}</Td>
                <Td>
                {(item.get('sellerEthAddress') !== user.get('ethAddress')) && 
                  <Button isLoading={false} onClick={() => askForReason(item.id)}>Request to buy</Button> || <Text fontSize="xs">n/a</Text>}
                </Td>
              </Tr>)}
            </Tbody>
            <Tfoot>
              <Tr>
              <Th>Data Pack ID</Th>
                <Th>Seller Address</Th>
                <Th>Data Preview</Th>
                <Th>Actions</Th>
              </Tr>
            </Tfoot>
          </Table>
        
          <Modal
            initialFocusRef={initialRef}
            isOpen={isOpen}
            onClose={onCloseCleanUp}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Create your account</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <FormControl>
                  <FormLabel>What will the data will be used for?</FormLabel>
                  <Input ref={initialRef} value={reasonToBuy} onChange={(event) => setReasonToBuy(event.currentTarget.value)} />
                </FormControl>
              </ModalBody>

              <ModalFooter>
                <Button isLoading={isSaving} onClick={requestToBuy}>Send Buy Offer</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Box>}
    </Stack>
  );
};

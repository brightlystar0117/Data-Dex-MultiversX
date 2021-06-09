import React, { useEffect, useState } from 'react';
import { useMoralis, useMoralisQuery } from 'react-moralis';
import { Box, Stack, HStack } from '@chakra-ui/layout';
import {
  Skeleton, Alert, Text, Link,
  AlertIcon, AlertTitle, CloseButton, Heading,
  Table, Thead, Tbody, Tfoot, Tr, Th, Td, TableCaption,
  useToast,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons'
import ShortAddress from './ShortAddress';

export default function() {
  const toast = useToast();
  const { user } = useMoralis();
  const [userDataOrders, setUserDataOrders] = useState([]);
  const { data: dataOrders, error: errorDataOrderGet, isLoading } = useMoralisQuery("DataOrder", query =>
    query.ascending("createdAt")
  );
  
  useEffect(() => {
    if (user && user.get('ethAddress') && dataOrders.length > 0) {
      setUserDataOrders(dataOrders.filter(i => (i.get('buyerEthAddress') === user.get('ethAddress'))));
    }
  }, [dataOrders]);

  return (
    <Stack spacing={5}>
      <Heading size="lg">Purchased Data</Heading>

      {errorDataOrderGet && 
        <Alert status="error">
          <Box flex="1">
            <AlertIcon />
            <AlertTitle>{errorDataOrderGet.message}</AlertTitle>
          </Box>
          <CloseButton position="absolute" right="8px" top="8px" />
        </Alert>
      }
      {userDataOrders.length === 0 && 
        <Stack w="1000px">
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Box />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </Stack> || 
        <Box>
          <Table variant="simple">
            <TableCaption>The following data was purchased by you</TableCaption>
            <Thead>
              <Tr>
                <Th>Data Order ID</Th>
                <Th>Data Pack ID</Th>
                <Th>Data File</Th>
                <Th>Price Paid</Th>
                <Th>TX Hash</Th>
              </Tr>
            </Thead>
            <Tbody>
              {userDataOrders.filter(i => (i.get('buyerEthAddress') === user.get('ethAddress'))).map((item) => <Tr key={item.id}>
                <Td>{item.id}</Td>
                <Td>{item.get('dataPackId')}</Td>
                <Td><Link href={item.get('dataFileUrl')} isExternal> View Data File <ExternalLinkIcon mx="2px" /></Link></Td>
                <Td>{item.get('pricePaid')} MYDA</Td>
                <Td><Link href={`https://ropsten.etherscan.io/tx/${item.get('txHash')}`} isExternal> View <ExternalLinkIcon mx="2px" /></Link></Td>
              </Tr>)}
            </Tbody>
            <Tfoot>
              <Tr>
                <Th>Data Order ID</Th>
                <Th>Data Pack ID</Th>
                <Th>Data File</Th>
                <Th>Price Paid</Th>
                <Th>TX Hash</Th>
              </Tr>
            </Tfoot>
          </Table>
        </Box>}
    </Stack>
  );
};

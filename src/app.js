import { useEffect, useState } from 'react';
import { Button, Text, Image, Divider, SlideFade, useDisclosure } from '@chakra-ui/react';
import { Container, Heading, Flex, Spacer, Box, Stack, HStack, Center } from '@chakra-ui/layout';
import { useMoralis } from 'react-moralis';
import { Auth } from './Auth';
import SellData from './SellData';
import BuyData from './BuyData';
import PurchasedData from './PurchasedData';
import ShortAddress from './ShortAddress';
import Tools from './Tools';
import { MENU, ABIS, sleep } from './util';
import { mydaContractAddress } from './secrets.js';
import logo from './img/logo-1.png';

function App() {
  const { isAuthenticated, logout, user } = useMoralis();
  const { web3 } = useMoralis();
  const [menuItem, setMenuItem] = useState(0);
  const [myMydaBal, setMydaBal] = useState(0);
  const { isOpen, onToggle } = useDisclosure();
  const [itheumAccount, setItheumAccount] = useState(null);

  useEffect(async () => {
    if (user && web3) {
      await showMydaBalance();
      await sleep(1);
      onToggle();
    }
  }, [user, web3]);

  const handleRefreshBalance = async () => {
    await showMydaBalance();
  };

  const showMydaBalance = async () => {
    const walletAddress = user.get('ethAddress');
    const contract = new web3.eth.Contract(ABIS.token, mydaContractAddress);
    
    const decimals = await contract.methods.decimals().call();
    console.log('🚀 ~ useEffect ~ decimals', decimals);
    const balance = await contract.methods.balanceOf(walletAddress).call();

    const BN = web3.utils.BN;
    const balanceWeiString = balance.toString();
    const balanceWeiBN = new BN(balanceWeiString);

    const decimalsBN = new BN(decimals);
    const divisor = new BN(10).pow(decimalsBN);

    const beforeDecimal = balanceWeiBN.div(divisor)
    // console.log(beforeDecimal.toString())    // >> 31
    
    // const afterDecimal  = balanceWeiBN.mod(divisor)
    // console.log(afterDecimal.toString())     // >> 415926500000000000
    
    setMydaBal(beforeDecimal.toString());
  }

  if (isAuthenticated) {
    return (
      <Container maxW="container.xxl">
        <Flex direction="column" justify="space-between">
          <Stack spacing={5} mt={5}>
            <Flex>
              <Image
                boxSize="75px"
                height="auto"
                src={logo}
                alt="Itheum Data Dex"
              />
              <Box p="2">
                <Heading>Itheum Data Dex</Heading>
              </Box>
              <Spacer />
              <Box>
                <HStack>
                  
                  <SlideFade in={isOpen} reverse={!isOpen} offsetY="20px">
                    <Box
                      as="text"
                      p={4}
                      color="white"
                      fontWeight="bold"
                      borderRadius="md"
                      bgGradient="linear(to-l, #7928CA, #FF0080)">MYDA {myMydaBal}
                    </Box>
                  </SlideFade>
                  <Text fontSize="xs"><ShortAddress address={user.get('ethAddress')} /></Text>
                  {itheumAccount && <Text>{`${itheumAccount.firstName} ${itheumAccount.lastName}`}</Text>}
                  <Button onClick={() => logout()}>Logout</Button>
                </HStack>
              </Box>
            </Flex>

            <Flex direction="row">
              <Box mt={5} ml={5}>
                <Stack direction="column" spacing={4} align="left">
                  <Button colorScheme="teal" isDisabled={menuItem === MENU.HOME} variant="solid" onClick={() => (setMenuItem(MENU.HOME))}>Home</Button>
                  <Button colorScheme="teal" isDisabled={menuItem === MENU.BUY} variant="solid" onClick={() => (setMenuItem(MENU.BUY))}>Buy Data</Button>
                  <Button colorScheme="teal" isDisabled={menuItem === MENU.SELL} variant="solid" onClick={() => (setMenuItem(MENU.SELL))}>Sell Data</Button>
                  <Button colorScheme="teal" isDisabled={menuItem === MENU.PURCHASED} variant="solid" onClick={() => (setMenuItem(MENU.PURCHASED))}>Purchased Data</Button>
                </Stack>
              </Box>

              <Box minH="80vh" ml={10}>
                <Divider orientation="vertical" />
              </Box>

              <Box ml="10" mt={5}>
                {menuItem === MENU.HOME && <Tools setMenuItem={setMenuItem} itheumAccount={itheumAccount} onRefreshBalance={handleRefreshBalance} onItheumAccount={setItheumAccount} />}
                {menuItem === MENU.BUY && <BuyData onRefreshBalance={handleRefreshBalance} />}
                {menuItem === MENU.SELL && <SellData itheumAccount={itheumAccount} />}
                {menuItem === MENU.PURCHASED && <PurchasedData />}
              </Box>
            </Flex>
          </Stack>
          <Box></Box>
        </Flex>
      </Container>
    );
  }

  return (
    <Container>
      <Center h="500px">
        <Box p="10" borderWidth="2px" borderRadius="lg" overflow="hidden">
          <Stack>
              <Image
                boxSize="150px"
                height="auto"
                src={logo}
                alt="Itheum Data Dex"
                margin="auto"
              />
            <Heading size="lg">Itheum Data Dex</Heading>
            <Auth />
          </Stack>
        </Box>
      </Center>
    </Container>
  );
}

export default App;

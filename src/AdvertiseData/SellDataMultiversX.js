import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { Heading, Box, Stack } from '@chakra-ui/layout';
import { CheckCircleIcon } from '@chakra-ui/icons';
import {
  Button, Input, Text, HStack, Spinner, Skeleton, Center,
  Alert, AlertIcon, AlertTitle, AlertDescription, CloseButton, CircularProgress,
  Image, Badge, Wrap, Flex, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  useToast, useDisclosure, Checkbox, Tag,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverArrow, PopoverCloseButton, PopoverBody,
  Link,
} from '@chakra-ui/react';
import ChainSupportedInput from 'UtilComps/ChainSupportedInput';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks/account';
import { DataNftMintContract } from 'MultiversX/dataNftMint';
import { useTrackTransactionStatus, useGetPendingTransactions } from '@multiversx/sdk-dapp/hooks';
import { ResultsParser } from '@multiversx/sdk-core';
import axios from 'axios';
import { NFTStorage, File } from 'nft.storage'
import mime from 'mime'

import {
  uxConfig,
  sleep,
  MENU,
  convertWeiToEsdt,
  tryParseInt,
  isValidNumericCharacter,
} from 'libs/util';
import { useChainMeta } from 'store/ChainMetaContext';
import { set } from 'lodash';
import { checkBalance } from 'MultiversX/api';

const InputLabelWithPopover = ({ children, tkey }) => {
  let title = '', text = '';
  if (tkey === 'data-stream-url') {
    title = 'Data Stream URL';
    text = 'The URL of the hosted data asset that you would like to trade. This URL should be publicly accessible behind a secure domain (one that starts with https://)';
  } else if (tkey === 'data-preview-url') {
    title = 'Data Preview URL';
    text = 'A URL of a free preview of full data asset which should be publicly accessible behind a secure domain (one that starts with https://)';
  } else if (tkey === 'data-marshal-url') {
    title = 'Data Marshal URL';
    text = 'The Data Marshal is the service that brokers the on-chain access control for your data asset';
  } else if (tkey === 'token-name') {
    title = 'Token Name (Short Title)';
    text = 'A short title to describe your data asset. This will be used as the NFT token name';
  } else if (tkey === 'dataset-title') {
    title = 'Dataset Title';
    text = 'A longer title to describe your data asset';
  } else if (tkey === 'dataset-description') {
    title = 'Dataset Description';
    text = 'A description of your data asset';
  } else if (tkey === 'number-of-copies') {
    title = 'Number of Copies';
    text = 'The total "supply" you would like to mint (i.e. individual copies of your data access license)';
  } else if (tkey === 'royalties') {
    title = 'Royalties';
    text = 'The "Creator Royalty" you will earn each time a copy is re-traded in the Data NFT Marketplace';
  }

  return (
    <Flex>
      <Popover trigger='hover' placement='auto'>
        <PopoverTrigger>
          {children}
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader fontWeight='semibold'>{title}</PopoverHeader>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverBody>
            {text}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Flex>
  );
}

const checkUrlReturns200 = async (url) => {
  // check that URL returns 200 code
  try {
    const res = await axios.get(url);
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

export default function SellDataMX({ onRfMount, itheumAccount }) {
  const { address: mxAddress } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const { chainMeta: _chainMeta, setChainMeta } = useChainMeta();
  const toast = useToast();
  const [sellerDataPreview, setSellerDataPreview] = useState('');
  const [sellerData, setSellerData] = useState('');
  const [isArbirData, setIsArbirData] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ s1: 0, s2: 0, s3: 0, s4: 0 });
  const [mintingSuccessful, setMintingSuccessful] = useState(false);
  const { isOpen: isProgressModalOpen, onOpen: onProgressModalOpen, onClose: onProgressModalClose } = useDisclosure();
  const { isOpen: isDrawerOpenTradeStream, onOpen: onOpenDrawerTradeStream, onClose: onCloseDrawerTradeStream } = useDisclosure();
  const { isOpen: isReadTermsModalOpen, onOpen: onReadTermsModalOpen, onClose: onReadTermsModalClose } = useDisclosure();
  const [currSellObject, setCurrSellObject] = useState(null);
  const [fetchDataLoading, setFetchDataLoading] = useState(true);

  const [isStreamTrade, setIsStreamTrade] = useState(0);

  const [oneNFTImgLoaded, setOneNFTImgLoaded] = useState(false);
  const [dataNFTImg, setDataNFTImg] = useState(null);
  const [dataNFTTokenName, setDataNFTTokenName] = useState('');
  const [dataNFTCopies, setDataNFTCopies] = useState(1);
  const [dataNFTRoyalty, setDataNFTRoyalty] = useState(0);
  const [dataNFTStreamUrl, setDataNFTStreamUrl] = useState('');
  const [dataNFTStreamPreviewUrl, setDataNFTStreamPreviewUrl] = useState('');
  const [dataNFTMarshalService, setDataNFTMarshalService] = useState();
  const [errDataNFTStreamGeneric, setErrDataNFTStreamGeneric] = useState(null);

  const [datasetTitle, setDatasetTitle] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [readTermsChecked, setReadTermsChecked] = useState(false);
  const [readAntiSpamFeeChecked, setReadAntiSpamFeeChecked] = useState(false);

  const [minRoyalties, setMinRoyalties] = useState(-1);
  const [maxRoyalties, setMaxRoyalties] = useState(-1);
  const [maxSupply, setMaxSupply] = useState(-1);
  const [antiSpamTax, setAntiSpamTax] = useState(-1);

  const [dataNFTStreamUrlValid, setDataNFTStreamUrlValid] = useState(false);
  const [dataNFTStreamPreviewUrlValid, setDataNFTStreamPreviewUrlValid] = useState(false);
  const [dataNFTMarshalServiceValid, setDataNFTMarshalServiceValid] = useState(false);

  const [itheumBalance, setItheumBalance] = useState(0);

  const [mintDataNFTDisabled, setMintDataNFTDisabled] = useState(true);
  const [userFocusedForm, setUserFocusedForm] = useState(false);

  const mxDataNftMintContract = new DataNftMintContract(_chainMeta.networkId);
  // query settings from Data NFT Minter SC
  useEffect(() => {
    (async () => {
      const interaction = mxDataNftMintContract.contract.methods.getMinRoyalties();
      const query = interaction.check().buildQuery();
      const queryResponse = await mxDataNftMintContract.networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue } = new ResultsParser().parseQueryResponse(queryResponse, endpointDefinition);
      const value = firstValue.valueOf();
      setMinRoyalties(value.toNumber() / 100);
    })();
    (async () => {
      const interaction = mxDataNftMintContract.contract.methods.getMaxRoyalties();
      const query = interaction.check().buildQuery();
      const queryResponse = await mxDataNftMintContract.networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue } = new ResultsParser().parseQueryResponse(queryResponse, endpointDefinition);
      const value = firstValue.valueOf();
      setMaxRoyalties(value.toNumber() / 100);
    })();
    (async () => {
      const interaction = mxDataNftMintContract.contract.methods.getMaxSupply();
      const query = interaction.check().buildQuery();
      const queryResponse = await mxDataNftMintContract.networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue } = new ResultsParser().parseQueryResponse(queryResponse, endpointDefinition);
      const value = firstValue.valueOf();
      setMaxSupply(value.toNumber());
    })();
    (async () => {
      const interaction = mxDataNftMintContract.contract.methods.getAntiSpamTax([_chainMeta.contracts.itheumToken]);
      const query = interaction.check().buildQuery();
      const queryResponse = await mxDataNftMintContract.networkProvider.queryContract(query);
      const endpointDefinition = interaction.getEndpoint();
      const { firstValue } = new ResultsParser().parseQueryResponse(queryResponse, endpointDefinition);
      const value = firstValue.valueOf();
      setAntiSpamTax(convertWeiToEsdt(value).toNumber());
    })();
  }, []);

  // query Itheum balance of User
  useEffect(() => {
    if (mxAddress && _chainMeta) {
      (async () => {
        const data = await checkBalance(_chainMeta.contracts.itheumToken, mxAddress, _chainMeta.networkId);
        if (typeof data.balance !== 'undefined') {
          setItheumBalance(convertWeiToEsdt(data.balance).toNumber());
        }
      })();
    }
  }, [mxAddress, hasPendingTransactions]);

  //
  const [userData, setUserData] = useState({});
  const getUserData = async() => {
    if (mxAddress && !hasPendingTransactions) {
      const _userData = await mxDataNftMintContract.getUserDataOut(mxAddress, _chainMeta.contracts.itheumToken);
      setUserData(_userData);
    }
  };
  useEffect(() => {
    getUserData();
  }, [mxAddress, hasPendingTransactions]);

  // set initial states for validation
  useEffect(() => {
    onChangeDataNFTStreamUrl('');
    onChangeDataNFTStreamPreviewUrl('');
    onChangeDataNFTMarshalService('https://itheumapi.com/ddex/datamarshal/v1/services/generate');
    onChangeDataNFTTokenName('');
    onChangeDatasetTitle('');
    onChangeDatasetDescription('');
    handleChangeDataNftCopies(1);
    handleChangeDataNftRoyalties(0);

    setMinRoyalties(-2);
    setMaxRoyalties(-2);
    setMaxSupply(-2);
    setAntiSpamTax(-2);
  }, []);

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // validation logic

  const [dataNFTStreamUrlError, setDataNFTStreamUrlError] = useState('');
  const onChangeDataNFTStreamUrl = (value) => {
    const trimmedValue = value.trim();
    let error = '';

    if (!trimmedValue.startsWith('https://')) {
      error = 'Data Stream URL must start with \'https://\'';
    } else if (trimmedValue.includes(' ')) {
      error = 'Data Stream URL cannot contain spaces';
    } else if (dataNFTStreamPreviewUrl === trimmedValue) {
      error = 'Data Stream URL cannot be same as the Data Stream Preview URL';
    } else if (trimmedValue.length > 1000) {
      error = 'Length of Data Stream URL cannot exceed 1000';
    } else {
      // temp disable until we work out a better way to do it without CORS errors on 3rd party hosts
      checkUrlReturns200(trimmedValue).then(res => setDataNFTStreamUrlValid(res));
    }

    setDataNFTStreamUrlError(error);
    setDataNFTStreamUrl(trimmedValue);
  }

  const [dataNFTStreamPreviewUrlError, setDataNFTStreamPreviewUrlError] = useState('');
  const onChangeDataNFTStreamPreviewUrl = (value) => {
    const trimmedValue = value.trim();
    let error = '';

    if (!trimmedValue.startsWith('https://')) {
      error = 'Data Preview URL must start with \'https://\'';
    } else if (trimmedValue.includes(' ')) {
      error = 'Data Preview URL cannot contain spaces';
    } else if (dataNFTStreamUrl === trimmedValue) {
      error = 'Data Preview URL cannot be same as the Data Stream URL';
    } else if (trimmedValue.length > 1000) {
      error = 'Length of Data Preview URL cannot exceed 1000';
    } else if (trimmedValue.length > 1000) {
      error = 'Length of Data Preview URL cannot exceed 1000';
    } else {
      // temp disable until we work out a better way to do it without CORS errors on 3rd party hosts
      checkUrlReturns200(trimmedValue).then(res => setDataNFTStreamPreviewUrlValid(res));
    }

    setDataNFTStreamPreviewUrlError(error);
    setDataNFTStreamPreviewUrl(trimmedValue);
  }

  const onChangeDataNFTMarshalService = (value) => {
    const trimmedValue = value.trim();

    // Itheum Data Marshal Service Check
    checkUrlReturns200('https://itheumapi.com/health-check').then(res => setDataNFTMarshalServiceValid(res)); // does not return 200 :(
    setDataNFTMarshalServiceValid(true);

    setDataNFTMarshalService(trimmedValue);
  }

  const [dataNFTTokenNameError, setDataNFTTokenNameError] = useState('');
  const onChangeDataNFTTokenName = (value) => {
    const trimmedValue = value.trim();
    let error = '';

    if (trimmedValue.length < 3 || trimmedValue.length > 20) {
      error = 'Length of Token Name must be between 3 and 20 characters';
    } else if (!trimmedValue.match(/^[0-9a-zA-Z]+$/)) {
      error = 'Token Name can only contain alphanumeric characters';
    }

    setDataNFTTokenNameError(error);
    setDataNFTTokenName(trimmedValue);
  }

  const [datasetTitleError, setDatasetTitleError] = useState('');
  const onChangeDatasetTitle = (value) => {
    let error = '';

    if (value.length < 10 || value.length > 50) {
      error = 'Length of Dataset Title must be between 10 and 50 characters';
    } else if (!value.match(/^[0-9a-zA-Z\s]+$/)) {
      error = 'Dataset Title can only contain alphanumeric characters';
    }

    setDatasetTitleError(error);
    setDatasetTitle(value);
  }

  const [datasetDescriptionError, setDatasetDescriptionError] = useState('');
  const onChangeDatasetDescription = (value) => {
    let error = '';

    if (value.length < 10 || value.length > 250) {
      error = 'Length of Dataset Description must be between 10 and 250 characters';
    }

    setDatasetDescriptionError(error);
    setDatasetDescription(value);
  }

  const [dataNFTCopiesError, setDataNFTCopiesError] = useState('');
  const handleChangeDataNftCopies = (value) => {
    let error = '';
    if (value < 1) {
      error = 'Number of copies cannot be negative';
    } else if (maxSupply >= 0 && value > maxSupply) {
      error = `Number of copies cannot exceed ${maxSupply}`;
    }

    setDataNFTCopiesError(error);
    setDataNFTCopies(value);
  }

  const [dataNFTRoyaltyError, setDataNFTRoyaltyError] = useState('');
  const handleChangeDataNftRoyalties = (value) => {
    let error = '';
    if (value < 0) {
      error = 'Royalties cannot be negative';
    } else if (minRoyalties >= 0 && value < minRoyalties) {
      error = `Royalties cannot be lower than ${minRoyalties}`;
    } else if (maxRoyalties >= 0 && value > maxRoyalties) {
      error = `Royalties cannot be higher than ${maxRoyalties}`;
    }

    setDataNFTRoyaltyError(error);
    setDataNFTRoyalty(value);
  }

  useEffect(() => {
    // init value
    handleChangeDataNftRoyalties(minRoyalties);
  }, [minRoyalties, maxRoyalties]);
  useEffect(() => {
    // init value
    handleChangeDataNftCopies(1);
  }, [maxSupply]);

  useEffect(() => {
    setMintDataNFTDisabled(
      dataNFTStreamUrlError
      || dataNFTStreamPreviewUrlError
      || dataNFTTokenNameError
      || datasetTitleError
      || datasetDescriptionError
      || dataNFTCopiesError
      || dataNFTRoyaltyError
      || !dataNFTStreamUrlValid
      || !dataNFTStreamPreviewUrlValid
      || !dataNFTMarshalServiceValid
      || !readTermsChecked
      || !readAntiSpamFeeChecked

      || minRoyalties < 0
      || maxRoyalties < 0
      || maxSupply < 0
      || antiSpamTax < 0

      || itheumBalance < antiSpamTax

      || (userData && userData.contractWhitelistEnabled && !userData.userWhitelistedForMint) // if userData.contractWhitelistEnabled is true, it means whitelist mode is on; only whitelisted users can mint
    
      || (userData && userData.contractPaused)
    );
  }, [
    dataNFTStreamUrlError,
    dataNFTStreamPreviewUrlError,
    dataNFTTokenNameError,
    datasetTitleError,
    datasetDescriptionError,
    dataNFTCopiesError,
    dataNFTRoyaltyError,
    dataNFTStreamUrlValid,
    dataNFTStreamPreviewUrlValid,
    dataNFTMarshalServiceValid,
    readTermsChecked,
    readAntiSpamFeeChecked,

    minRoyalties,
    maxRoyalties,
    maxSupply,
    antiSpamTax,

    itheumBalance,

    userData,
  ]);
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  const mintTxFail = (foo) => {
    console.log('mintTxFail', foo);
    setErrDataNFTStreamGeneric(new Error('Transaction to mint Data NFT has failed'));
  }

  const mintTxCancelled = (foo) => {
    console.log('mintTxCancelled', foo);
    setErrDataNFTStreamGeneric(new Error('Transaction to mint Data NFT was cancelled'));
  }

  const mintTxSuccess = async (foo) => {
    console.log('mintTxSuccess', foo);
    setSaveProgress(prevSaveProgress => ({ ...prevSaveProgress, s4: 1 }));
    await sleep(3);

    setMintingSuccessful(true);
  }

  const [mintSessionId, setMintSessionId] = useState(null);

  const getDataForSale = (programId, isStreamTrade = false) => {
    if (isStreamTrade) {
      onOpenDrawerTradeStream();
    }

    if (programId) {
      const selObj = { ...itheumAccount.programsAllocation.find(i => i.program === programId), ...itheumAccount._lookups.programs[programId] };
      setCurrSellObject(selObj);

      fetchData(selObj);
    } else {
      setIsArbirData(true);
    }

    setIsStreamTrade(isStreamTrade)
  }

  const fetchData = async selObj => {
    const myHeaders = new Headers();
    myHeaders.append('authorization', process.env.REACT_APP_ENV_ITHEUMAPI_M2M_KEY);

    const requestOptions = {
      method: 'GET',
      headers: myHeaders
    };

    const res = await fetch(`https://itheumapi.com/readings/${selObj.shortId}/${selObj.type}/range?fromTs=${selObj.fromTs}&toTs=${selObj.toTs}`, requestOptions);
    const data = await res.json();

    if (data && data.length > 0) {
      const previewStr = `${data.length} data points from the ${selObj.programName} program collected from ${moment(selObj.fromTs).format(uxConfig.dateStr)} to ${moment(selObj.toTs).format(uxConfig.dateStr)}`;

      setSellerDataPreview(previewStr);
      setDatasetDescription(previewStr)
      setSellerData(JSON.stringify(data));
    }

    setFetchDataLoading(false);
  }

  const dataNFTSellSubmit = async () => {
    if (!mxAddress) {
      toast({
        title: 'Connect your wallet',
        status: 'error',
        isClosable: true,
      });
      return;
    }

    if (userData && Date.now() < userData.lastUserMintTime + userData.mintTimeLimit) {
      toast({
        title: `You can mint next Data NFT-FT after ${new Date(userData.lastUserMintTime + userData.mintTimeLimit).toLocaleString()}`,
        status: 'error',
        isClosable: true,
      });
      return;
    }

    const res = await validateBaseInput();
    if (res) {
      if (isStreamTrade) {
        dataNFTDataStreamAdvertise();
      }
    }
  }

  const dataNFTDataStreamAdvertise = async () => {
    /*
      1) Call the data marshal and get a encrypted data stream url and hash of url (s1)
      2) Use the hash for to generate the robot img URL from the generative API (s2)
        2.1) Save the new generative image to IPFS and get it's IPFS url (s3)
      3) Mint the SFT via the Minter Contract (s4)
    */

    setMintingSuccessful(false);
    onProgressModalOpen();

    const myHeaders = new Headers();
    myHeaders.append('authorization', process.env.REACT_APP_ENV_ITHEUMAPI_M2M_KEY);
    myHeaders.append('cache-control', 'no-cache');
    myHeaders.append('Content-Type', 'application/json');

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({ dataNFTStreamUrl })
    };

    try {
      const res = await fetch('https://itheumapi.com/ddex/datamarshal/v1/services/generate', requestOptions);
      const data = await res.json();

      if (data && data.encryptedMessage && data.messageHash) {
        setSellerData(data.encryptedMessage); // the data URL is the seller data in this case
        setSaveProgress(prevSaveProgress => ({ ...prevSaveProgress, s1: 1 }));

        buildUniqueImage({
          dataNFTHash: data.messageHash,
          dataNFTStreamUrlEncrypted: data.encryptedMessage
        });
      } else {
        if (data.success === false) {
          setErrDataNFTStreamGeneric(new Error(`${data.error.code}, ${data.error.message}`));
        } else {
          setErrDataNFTStreamGeneric(new Error('Data Marshal responded with an unknown error trying to generate your encrypted links'));
        }
      }
    } catch (e) {
      setErrDataNFTStreamGeneric(e);
    }
  }

  async function createFileFromUrl(url) {
    const res = await fetch(url);
    // console.log('res', res);
    const data = await res.blob();
    const type = mime.getType(data)
    // console.log('type', type);
    const _file = new File([data], 'image', { type: 'image/png' });
    // console.log('file', _file);

    return _file;
  }

  const buildUniqueImage = async ({ dataNFTHash, dataNFTStreamUrlEncrypted }) => {
    await sleep(3);
    const newNFTImg = `https://itheumapi.com/bespoke/ddex/generateNFTArt?hash=${dataNFTHash}`;
    // console.log('newNFTImg', newNFTImg);

    setSaveProgress(prevSaveProgress => ({ ...prevSaveProgress, s2: 1 }));

    let res;
    // catch IPFS error
    try {
      const image = await createFileFromUrl(newNFTImg);
      const nftstorage = new NFTStorage({ token: process.env.REACT_APP_ENV_NFT_STORAGE_KEY })
      res = await nftstorage.storeBlob(image);
    } catch (e) {
      setErrDataNFTStreamGeneric(new Error('Uploading the image on IPFS has failed'));
      return;
    }

    if (!res) {
      setErrDataNFTStreamGeneric(new Error('Uploading the image on IPFS has failed'));
      return;
    }
    const imageOnIpfsUrl = `https://ipfs.io/ipfs/${res}`;
    // console.log('imageOnIpfsUrl', imageOnIpfsUrl);

    setDataNFTImg(newNFTImg);
    setSaveProgress(prevSaveProgress => ({ ...prevSaveProgress, s3: 1 }));

    await sleep(3);

    handleOnChainMint({ imageOnIpfsUrl, dataNFTStreamUrlEncrypted });
  };

  const handleOnChainMint = async ({ imageOnIpfsUrl, dataNFTStreamUrlEncrypted }) => {
    await sleep(3);

    const { sessionId, error } = await mxDataNftMintContract.sendMintTransaction({
      name: dataNFTTokenName,
      media: imageOnIpfsUrl,
      data_marchal: dataNFTMarshalService,
      data_stream: dataNFTStreamUrlEncrypted,
      data_preview: dataNFTStreamPreviewUrl,
      royalties: Math.ceil(dataNFTRoyalty * 100),
      amount: dataNFTCopies,
      title: datasetTitle,
      description: datasetDescription,
      sender: mxAddress,
      itheumToken: _chainMeta.contracts.itheumToken,
      antiSpamTax: antiSpamTax,
    });

    setMintSessionId(sessionId);
  };

  const transactionStatus = useTrackTransactionStatus({
    transactionId: mintSessionId,
    onSuccess: mintTxSuccess,
    onFail: mintTxFail,
    onCancelled: mintTxCancelled,
  });

  const closeProgressModal = () => {
    toast({
      title: 'Success! Data NFT Minted. Head over to your "Data NFT Wallet" to view your new NFT',
      status: 'success',
      isClosable: true,
    });

    onProgressModalClose();
    onCloseDrawerTradeStream();

    // initialize modal status
    setSaveProgress({ s1: 0, s2: 0, s3: 0, s4: 0 });
    setMintingSuccessful(false);

    // remount the component (quick way to rest all state to pristine)
    onRfMount();
  }

  async function validateBaseInput() {
    if (isStreamTrade) {
      if (!dataNFTStreamUrl.includes('https://') || !dataNFTStreamPreviewUrl.includes('https://') || !dataNFTMarshalService.includes('https://')) {
        toast('Your data stream url inputs dont seem to be valid. for e.g. stream URLs / marshal service URLs need to have https:// in it');
        return false;
      } else {
        return true;
      }
    } else {
      // only need to validate json if it's not a stream trade
      try {
        JSON.parse(sellerData); // valid JSON check?
        return true;
      } catch (e) {
        toast('You need to provide some valid JSON for data!');
        return false;
      }
    }
  }

  return (
    <Stack spacing={5}>
      <Heading size="lg">Trade Data</Heading>
      <Heading size="xs" opacity=".7">Trade your personal data direct-to-buyer (peer-to-peer) or as Data NFTs across many NFT Marketplaces</Heading>

      {(itheumAccount && itheumAccount.programsAllocation.length > 0) &&
        <Wrap shouldWrapChildren={true} wrap="wrap" spacing={5}>
          {itheumAccount.programsAllocation.map(item => (
            <Box key={item.program} maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Image src={`https://itheum-static.s3-ap-southeast-2.amazonaws.com/dex-${itheumAccount._lookups.programs[item.program].img}.png`} alt="" />

              <Box p="6">
                <Box display="flex" alignItems="baseline">
                  <Badge borderRadius="full" px="2" colorScheme="teal"> New</Badge>
                  <Box
                    mt="1"
                    ml="2"
                    fontWeight="semibold"
                    as="h4"
                    lineHeight="tight"
                    noOfLines={1}>
                    {itheumAccount._lookups.programs[item.program].programName}
                  </Box>
                </Box>
                <Button mt="3" colorScheme="teal" variant="outline" onClick={() => getDataForSale(item.program)}>Trade Program Data</Button>
              </Box>

            </Box>
          ))}
        </Wrap>}

      <Wrap shouldWrapChildren={true} wrap="wrap" spacing={5}>
        <Box maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
          <Image src="https://itheum-static.s3.ap-southeast-2.amazonaws.com/data-stream.png" alt="" />

          <Box p="6">
            <Box display="flex" alignItems="baseline">
              <Box
                mt="1"
                fontWeight="semibold"
                as="h4"
                lineHeight="tight"
                noOfLines={1}>
                Trade a Data Stream as a Data NFT-FT
              </Box>
            </Box>
            <Button mt="3" colorScheme="teal" variant="outline" onClick={() => getDataForSale(null, 1)}>Advertise Data</Button>
          </Box>
        </Box>
      </Wrap>

      <Drawer onClose={onRfMount} isOpen={isDrawerOpenTradeStream} size="xl" closeOnEsc={false} closeOnOverlayClick={false}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <HStack spacing="5">
              <CloseButton size="lg" onClick={onRfMount} />
              {currSellObject &&
                <Stack>
                  <Text fontSize="2xl">Trade data from your <Text color="teal" fontSize="2xl">{currSellObject.programName}</Text> program</Text>
                </Stack> ||
                <Heading as='h4' size='lg'>Trade a Data Stream as a Data NFT-FT</Heading>
              }
            </HStack>
          </DrawerHeader>
          <DrawerBody onClick={() => {
            if (!userFocusedForm) {
              setUserFocusedForm(true);
            }
          }}>
            {(fetchDataLoading && !isArbirData) && <CircularProgress isIndeterminate color="teal" size="100" thickness="5px" /> ||

              <Stack spacing="5" mt="5">
                {
                  (minRoyalties < 0 
                    || maxRoyalties < 0 
                      || maxSupply < 0 
                        || antiSpamTax < 0 
                          || !dataNFTMarshalServiceValid 
                            || (userData && userData.contractWhitelistEnabled && !userData.userWhitelistedForMint)                            
                              || (userData && userData.contractPaused))
                  && <Alert status="error">
                    <Stack >
                      <AlertTitle fontSize="md" mb={2}>
                        <AlertIcon display='inline-block' />
                        <Text display='inline-block' lineHeight='2' style={{ verticalAlign: 'middle' }}>Uptime Errors</Text>
                      </AlertTitle>
                      <AlertDescription>
                        {minRoyalties < 0 && <Text fontSize="md">Unable to read default value of Min Royalties.</Text>}
                        {maxRoyalties < 0 && <Text fontSize="md">Unable to read default value of Max Royalties.</Text>}
                        {maxSupply < 0 && <Text fontSize="md">Unable to read default value of Max Supply.</Text>}
                        {antiSpamTax < 0 && <Text fontSize="md">Unable to read default value of Anti-Spam Tax.</Text>}
                        {!dataNFTMarshalServiceValid && <Text fontSize="md">Data Marshal service is not responding.</Text>}
                        {!dataNFTMarshalServiceValid && <Text fontSize="md">Generative image generation service is not responding.</Text>}
                        {(userData && userData.contractWhitelistEnabled && !userData.userWhitelistedForMint) && <AlertDescription fontSize="md">You are not currently whitelisted to mint Data NFTs</AlertDescription>}
                        {(userData && userData.contractPaused) && <Text fontSize="md">The minter smart contract is paused for maintenance.</Text>}
                      </AlertDescription>
                    </Stack>
                  </Alert>
                }

                <Text fontSize='sm' color='gray.400'>* required fields</Text>
                <Text fontSize='sm' color='gray.400' mt='0 !important'>+ click on an item's title to learn more</Text>

                <Text fontWeight="bold" color="teal.200" fontSize='xl' mt='8 !important'>Data Asset Detail</Text>

                <InputLabelWithPopover tkey='data-stream-url'>
                  <Text fontWeight="bold" fontSize='md'>Data Stream URL *</Text>
                </InputLabelWithPopover>

                <Input
                  mt='1 !important'
                  placeholder="e.g. https://mydomain.com/my_hosted_file.json"
                  value={dataNFTStreamUrl}
                  onChange={(event) => onChangeDataNFTStreamUrl(event.currentTarget.value)}
                />
                {(userFocusedForm && dataNFTStreamUrlError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{dataNFTStreamUrlError}</Text>
                )}
                {(userFocusedForm && !dataNFTStreamUrlValid) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>Data Stream URL must be a publicly accessible url</Text>
                )}

                <InputLabelWithPopover tkey='data-preview-url'>
                  <Text fontWeight="bold" fontSize='md'>Data Preview URL *</Text>
                </InputLabelWithPopover>

                <Input
                  mt='1 !important'
                  placeholder="e.g. https://mydomain.com/my_hosted_file_preview.json"
                  value={dataNFTStreamPreviewUrl}
                  onChange={(event) => onChangeDataNFTStreamPreviewUrl(event.currentTarget.value)}
                />
                {(userFocusedForm && dataNFTStreamPreviewUrlError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{dataNFTStreamPreviewUrlError}</Text>
                )}
                {(userFocusedForm && !dataNFTStreamPreviewUrlValid) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>Data Stream Preview URL must be a publicly accessible url</Text>
                )}

                <InputLabelWithPopover tkey='data-marshal-url'>
                  <Text fontWeight="bold" fontSize='md'>Data Marshal Url</Text>
                </InputLabelWithPopover>

                <Input
                  mt='1 !important'
                  value={dataNFTMarshalService}
                  disabled
                />
                {(userFocusedForm && !dataNFTMarshalServiceValid) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>Data Marshal Service is currently offline</Text>
                )}

                <Text fontWeight="bold" color="teal.200" fontSize='xl' mt='8 !important'>NFT Token Metadata</Text>

                <InputLabelWithPopover tkey='token-name'>
                  <Text fontWeight="bold" fontSize='md'>Token Name (Short Title) *</Text>
                </InputLabelWithPopover>

                <Input
                  mt='1 !important'
                  placeholder="NFT Token Name"
                  value={dataNFTTokenName}
                  onChange={(event) => onChangeDataNFTTokenName(event.currentTarget.value)}
                />
                <Text color="gray.400" fontSize='sm' mt='0 !important'>Between 3 and 20 alphanumeric characters only</Text>
                {(userFocusedForm && dataNFTTokenNameError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{dataNFTTokenNameError}</Text>
                )}

                <InputLabelWithPopover tkey='dataset-title'>
                  <Text fontWeight="bold" fontSize='md'>Dataset Title *</Text>
                </InputLabelWithPopover>

                <Input
                  mt='1 !important'
                  placeholder="Dataset Title"
                  value={datasetTitle}
                  onChange={(event) => onChangeDatasetTitle(event.currentTarget.value)}
                />
                <Text color="gray.400" fontSize='sm' mt='0 !important'>Between 10 and 50 alphanumeric characters only</Text>
                {(userFocusedForm && datasetTitleError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{datasetTitleError}</Text>
                )}

                <InputLabelWithPopover tkey='dataset-description'>
                  <Text fontWeight="bold" fontSize='md'>Dataset Description *</Text>
                </InputLabelWithPopover>

                <Textarea
                  mt='1 !important'
                  placeholder="Enter a description here"
                  value={datasetDescription}
                  onChange={(event) => onChangeDatasetDescription(event.currentTarget.value)}
                />
                <Text color="gray.400" fontSize='sm' mt='0 !important'>Between 10 and 250 characters only. URL allowed. Markdown (MD) allowed.</Text>
                {(userFocusedForm && datasetDescriptionError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{datasetDescriptionError}</Text>
                )}

                <InputLabelWithPopover tkey='number-of-copies'>
                  <Text fontWeight="bold" fontSize='md'>Number of copies</Text>
                </InputLabelWithPopover>

                <NumberInput
                  mt='1 !important'
                  size="md"
                  maxW={24}
                  step={1}
                  defaultValue={1}
                  min={1}
                  max={maxSupply > 0 ? maxSupply : 1}
                  value={dataNFTCopies}
                  isValidCharacter={isValidNumericCharacter}
                  onChange={handleChangeDataNftCopies}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text color="gray.400" fontSize="sm" mt='0 !important'>Limit the quality to increase value (rarity) - Suggested: less than {maxSupply}</Text>
                {(userFocusedForm && dataNFTCopiesError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{dataNFTCopiesError}</Text>
                )}

                <InputLabelWithPopover tkey='royalties'>
                  <Text fontWeight="bold" fontSize='md'>Royalties</Text>
                </InputLabelWithPopover>

                <NumberInput
                  mt='1 !important'
                  size="md"
                  maxW={24}
                  step={5}
                  defaultValue={minRoyalties}
                  min={minRoyalties > 0 ? minRoyalties : 0}
                  max={maxRoyalties > 0 ? maxRoyalties : 0}
                  isValidCharacter={isValidNumericCharacter}
                  value={dataNFTRoyalty}
                  onChange={handleChangeDataNftRoyalties}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text color="gray.400" fontSize="sm" mt='0 !important'>Min: {minRoyalties >= 0 ? minRoyalties : '-'}%, Max: {maxRoyalties >= 0 ? maxRoyalties : '-'}%</Text>
                {(userFocusedForm && dataNFTRoyaltyError) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>{dataNFTRoyaltyError}</Text>
                )}

                <Text fontWeight="bold" color="teal.200" fontSize='xl' mt='8 !important'>Terms and Fees</Text>
                <Text fontSize='md' mt='4 !important'>Minting a Data NFT and putting it for trade on the Data DEX means you have to agree to some strict “terms of use”, as an example, you agree that the data is free of any illegal material and that it does not breach any copyright laws. You also agree to make sure the Data Stream URL is always online. Given it's an NFT, you also have limitations like not being able to update the title, description, royalty, etc. But there are other conditions too. Take some time to read these “terms of use” before you proceed and it's critical you understand the terms of use before proceeding.</Text>
                <Flex mt='3 !important'><Button colorScheme="teal" variant='outline' size='sm' onClick={onReadTermsModalOpen}>Read Terms of Use</Button></Flex>
                <Checkbox
                  size='md'
                  mt='3 !important'
                  isChecked={readTermsChecked}
                  onChange={e => setReadTermsChecked(e.target.checked)}
                >I have read and I agree to the Terms of Use</Checkbox>
                {(userFocusedForm && !readTermsChecked) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>You must READ and Agree on Terms of Use</Text>
                )}

                <Text fontSize='md' mt='8 !important'>An “anti-spam fee” is required to ensure that the Data DEX does not get impacted by spam datasets created by bad actors. This fee will be dynamically adjusted by the protocol based on ongoing dataset curation discovery by the Itheum DAO.</Text>
                <Flex mt='3 !important'><Tag variant='solid' colorScheme='teal'>Anti-Spam Fee is currently {antiSpamTax < 0 ? '?' : antiSpamTax} ITHEUM tokens</Tag></Flex>
                {itheumBalance < antiSpamTax && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>You don't have enough ITHEUM for Anti-Spam Tax</Text>
                )}
                <Flex mt='3 !important'><Button colorScheme="teal" variant='outline' size='sm' onClick={onReadTermsModalOpen}>Read about the Anti-Spam fee</Button></Flex>
                <Checkbox
                  size='md'
                  mt='3 !important'
                  isChecked={readAntiSpamFeeChecked}
                  onChange={e => setReadAntiSpamFeeChecked(e.target.checked)}
                >I accept the deduction of the anti-spam minting fee from my wallet</Checkbox>
                {(userFocusedForm && !readAntiSpamFeeChecked) && (
                  <Text color='red.400' fontSize='sm' mt='1 !important'>You must READ and Agree on Terms of Use</Text>
                )}

                <Flex>
                  <ChainSupportedInput feature={MENU.SELL}>
                    <Button
                      mt="5"
                      colorScheme="teal"
                      isLoading={isProgressModalOpen}
                      onClick={dataNFTSellSubmit}
                      disabled={mintDataNFTDisabled}
                    >
                      Mint and Trade as NFT
                    </Button>
                  </ChainSupportedInput>
                </Flex>
              </Stack>}

            <Modal
              isOpen={isProgressModalOpen}
              onClose={closeProgressModal}
              closeOnEsc={false} closeOnOverlayClick={false}
            >
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Data Advertising Progress</ModalHeader>
                <ModalBody pb={6}>
                  <Stack spacing={5}>
                    <HStack>
                      {!saveProgress.s1 && <Spinner size="md" /> || <CheckCircleIcon w={6} h={6} />}
                      <Text>Generating encrypted data stream metadata</Text>
                    </HStack>

                    <HStack>
                      {!saveProgress.s2 && <Spinner size="md" /> || <CheckCircleIcon w={6} h={6} />}
                      <Text>Generating unique tamper-proof data stream signature</Text>
                    </HStack>

                    {dataNFTImg && <>
                      <Skeleton isLoaded={oneNFTImgLoaded} h={200} margin="auto">
                        <Center>
                          <Image src={dataNFTImg} h={200} w={200} borderRadius="md" onLoad={() => setOneNFTImgLoaded(true)} />
                        </Center>
                      </Skeleton>
                      <Box textAlign="center"><Text fontSize="xs">This image was created using the unique data signature (it's one of a kind!)</Text></Box>
                    </>}

                    <HStack>
                      {!saveProgress.s3 && <Spinner size="md" /> || <CheckCircleIcon w={6} h={6} />}
                      <Text>Saving NFT Metadata to IPFS</Text>
                    </HStack>

                    <HStack>
                      {!saveProgress.s4 && <Spinner size="md" /> || <CheckCircleIcon w={6} h={6} />}
                      <Text>Minting your new Data NFT on blockchain</Text>
                    </HStack>
                    {
                      mintingSuccessful && <Box textAlign='center' mt='6'>
                        <Alert status='success'>
                          <Text colorScheme='teal'>Success! Your Data NFT has been minted on the MultiversX Blockchain</Text>
                        </Alert>
                        <HStack mt='4'>
                          <Link href='datanfts/wallet' textDecoration='none' _hover={{ textDecoration: 'none' }}>
                            <Button colorScheme='teal'>Visit your Data NFT Wallet to see it!</Button>
                          </Link>
                          <Button colorScheme='teal' variant='outline' onClick={closeProgressModal}>Close & Return</Button>
                        </HStack>
                      </Box>
                    }

                    {errDataNFTStreamGeneric &&
                      <Alert status="error">
                        <Stack >
                          <AlertTitle fontSize="md">
                            <AlertIcon mb={2} />Process Error</AlertTitle>
                          {errDataNFTStreamGeneric.message && <AlertDescription fontSize="md">{errDataNFTStreamGeneric.message}</AlertDescription>}
                          <CloseButton position="absolute" right="8px" top="8px" onClick={() => onProgressModalClose()} />
                        </Stack>
                      </Alert>
                    }
                  </Stack>
                </ModalBody>
              </ModalContent>
            </Modal>

          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Modal
        isOpen={isReadTermsModalOpen}
        onClose={onReadTermsModalClose}
        closeOnEsc={false} closeOnOverlayClick={false}
      >
        <ModalOverlay
          bg='blackAlpha.700'
          backdropFilter='blur(10px) hue-rotate(90deg)'
        />
        <ModalContent>
          <ModalHeader>Data NFT-FT Terms of Use</ModalHeader>
          <ModalBody pb={6}>
            <Text>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</Text>
            <Flex justifyContent='end' mt='6 !important'><Button colorScheme="teal" onClick={onReadTermsModalClose}>I have read this</Button></Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

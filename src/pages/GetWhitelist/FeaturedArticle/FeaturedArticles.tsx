import React, { Fragment } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import coinTelegraph1 from "../../../assets/img/whitelist/coinTelegraph1.png";
import coinTelegraph2 from "../../../assets/img/whitelist/coinTelegraph2.png";
import coinTelegraph3 from "../../../assets/img/whitelist/coinTelegraph3.png";
import coinTelegraph4 from "../../../assets/img/whitelist/coinTelegraph4.png";
import { FeaturedArticlesCards } from "./components/FeaturedArticlesCards";

const cardContent = [
  {
    id: 1,
    headerImage: coinTelegraph1,
    title: "Cointelegraph • Aug 10, 2023",
    description: "How are Data NFTs helping build a decentralized data economy?",
    url: "https://explorer.itheum.io/multiversx-infographics",
  },
  {
    id: 2,
    headerImage: coinTelegraph2,
    title: "Cointelegraph • Mar 28, 2023",
    description: "Itheum joins Cointelegraph Accelerator Program to democratize data ownership",
    url: "https://explorer.itheum.io/multiversx-bubbles",
  },
  {
    id: 3,
    headerImage: coinTelegraph3,
    title: "Cointelegraph • Jan 11, 2022",
    description: 'Multiversx-based "open metaverse" data platform Itheum lands $1.5M seed round',
    url: "https://explorer.itheum.io/project-trailblazer",
  },
  {
    id: 4,
    headerImage: coinTelegraph4,
    title: "Cointelegraph • Mar 9, 2022",
    description: "Multiversx hosts Web3 data-brokerage platform Itheum to scale up its metaverse",
    url: "https://explorer.itheum.io/project-trailblazer",
  },
];

export const FeaturedArticles: React.FC = () => {
  return (
    <Flex flexDirection="column" w="full" h="auto" justifyContent="center" my={10}>
      <Text textAlign="center" fontSize="59px" fontFamily="Clash-Medium" my={5}>
        Featured Articles
      </Text>
      <Box display="flex" flexDirection={{ xl: "row" }} justifyContent="center" flexWrap="wrap" alignItems="center" gap={6} mx={5} mb={5}>
        {cardContent.map((item) => {
          return (
            <Fragment key={item.id}>
              <FeaturedArticlesCards id={item.id} headerImage={item.headerImage} title={item.title} description={item.description} url={item.url} />
            </Fragment>
          );
        })}
      </Box>
    </Flex>
  );
};

import type { Route } from "./+types/all-sentences";
import { Container, Title, Text } from "@mantine/core";

export function meta({}: Route.MetaArgs) {
  return [{ title: "All Sentences" }];
}

export default function AllSentences() {
  return (
    <Container size="md" className="pt-16">
      <Title order={2}>All Sentences</Title>
      <Text mt="sm">This is a placeholder listing of all sentences. Content coming soon.</Text>
    </Container>
  );
}

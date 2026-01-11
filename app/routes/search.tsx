import type { Route } from "./+types/search";
import { Container, Title, Text } from "@mantine/core";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Search" }];
}

export default function Search() {
  return (
    <Container size="md" className="pt-16">
      <Title order={2}>Search</Title>
      <Text mt="sm">This is a placeholder for the Search view. Search functionality will be added later.</Text>
    </Container>
  );
}

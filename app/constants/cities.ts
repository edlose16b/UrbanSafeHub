export type CityCountryLabelKey =
  | "cityCountryArgentina"
  | "cityCountryBolivia"
  | "cityCountryColombia"
  | "cityCountryEcuador"
  | "cityCountryMexico"
  | "cityCountryPeru"
  | "cityCountryVenezuela";

export type CityOption = {
  id: string;
  label: string;
  countryLabelKey: CityCountryLabelKey;
  center: [number, number];
  zoom: number;
  imageSrc: string;
};

export const CITY_OPTIONS: readonly CityOption[] = [
  {
    id: "lima",
    label: "Lima",
    countryLabelKey: "cityCountryPeru",
    center: [-12.0464, -77.0428],
    zoom: 12,
    imageSrc: "/cities/lima.jpg",
  },
  {
    id: "trujillo",
    label: "Trujillo",
    countryLabelKey: "cityCountryPeru",
    center: [-8.1116, -79.0288],
    zoom: 12,
    imageSrc: "/cities/trujillo.jpg",
  },
  {
    id: "bogota",
    label: "Bogota",
    countryLabelKey: "cityCountryColombia",
    center: [4.711, -74.0721],
    zoom: 12,
    imageSrc: "/cities/bogota.jpg",
  },
  {
    id: "ciudad-de-mexico",
    label: "Ciudad de Mexico",
    countryLabelKey: "cityCountryMexico",
    center: [19.4326, -99.1332],
    zoom: 11,
    imageSrc: "/cities/ciudaddemexico.webp",
  },
  {
    id: "buenos-aires",
    label: "Buenos Aires",
    countryLabelKey: "cityCountryArgentina",
    center: [-34.6037, -58.3816],
    zoom: 12,
    imageSrc: "/cities/buenosaires.jpg",
  },
  {
    id: "quito",
    label: "Quito",
    countryLabelKey: "cityCountryEcuador",
    center: [-0.1807, -78.4678],
    zoom: 12,
    imageSrc: "/cities/quito.webp",
  },
  {
    id: "caracas",
    label: "Caracas",
    countryLabelKey: "cityCountryVenezuela",
    center: [10.4806, -66.9036],
    zoom: 12,
    imageSrc: "/cities/caracas.png",
  },
  {
    id: "la-paz",
    label: "La Paz",
    countryLabelKey: "cityCountryBolivia",
    center: [-16.4897, -68.1193],
    zoom: 12,
    imageSrc: "/cities/lapaz.jpg",
  },
] as const;

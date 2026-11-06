export declare const searchFoods: (query: string, pageSize?: number) => Promise<{
    fdcId: number;
    name: string;
    brand: string | null;
    dataType: string;
    nutrientsPer100g: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sugar: number;
        sodium: number;
    };
}[]>;
declare const _default: {
    searchFoods: typeof searchFoods;
};
export default _default;
//# sourceMappingURL=usda.service.d.ts.map
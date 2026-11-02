
export async function listProductsForManagement(
  input: ListProductsInput,
) {
  const {
    page,
    pageSize,
    search,
    isActive,
    categoryId,
    sortBy,
    sortOrder,
  } = input;

  const where = {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              sku: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: [
        {
          [sortBy]: sortOrder,
        },
        {
          id: "asc",
        },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        price: true,
        costPrice: true,
        isActive: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.product.count({
      where,
    }),
  ]);

  return {
    products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

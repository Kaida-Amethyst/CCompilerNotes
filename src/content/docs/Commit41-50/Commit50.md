---
title: 50. Struct Alignment
---

## commit log

```plaintext
Align struct members
```

我们知道，struct的成员变量是有对齐这种机制的。譬如：

```c
struct S {
  int x;
  short y;
  double z;
};
```

S的大小是16，而并非14。这就是对齐机制发挥的作用。

## 头文件

首先在struct Type里面添加上`align`字段：

```c
struct Type {
  /*  other fields  */
  int align;
  /*  other fields  */
};
```

然后在头文件中属于codegen的位置上，加上`align_to`函数，这个函数原本就有，不过是static的，现在我们将其变成全局函数。

```c
int align_to(int n, int align);
```

## codegen

这里我们先修改一下codegen，就是把align_to函数从static函数改成全局函数。

```c
int align_to(int n, int align) {
  return (n + align - 1) / align * align;
}
```

## type.c

因为我们先前是修改了`struct Type`，现在我们把一些Type的初始化修改一下：

```c
Type *ty_char = &(Type){TY_CHAR, 1, 1};
Type *ty_int = &(Type){TY_INT, 8, 8};
```

另外，新添加一个`new_type`，然后修改一些类型创建的过程。

```c
static Type *new_type(TypeKind kind, int size, int align) {
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = kind;
  ty->size = size;
  ty->align = align;
  return ty;
}

Type *pointer_to(Type *base) {
  Type *ty = new_type(TY_PTR, 8, 8);
  ty->base = base;
  return ty;
}

Type *array_of(Type *base, int len) {
  Type *ty = new_type(TY_ARRAY, base->size * len, base->align);
  ty->base = base;
  ty->array_len = len;
  return ty;
}
```

## parser

最要紧的，就是修改struct的align，修改parser中的`struct_decl`函数：

```c
static Type *struct_decl(Token **rest, Token *tok) {
  tok = skip(tok, "{");

  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_STRUCT;
  struct_members(rest, tok, ty);
  ty->align = 1;

  int offset = 0;
  for (Member *mem = ty->members; mem; mem = mem->next) {
    offset = align_to(offset, mem->ty->align);
    mem->offset = offset;
    offset += mem->ty->size;

    if (ty->align < mem->ty->align) 
      ty->align = mem->ty->align;
  }
  ty->size = align_to(offset, ty->align);
  return ty;
}
```

上面的代码就清晰地展示出了align机制的运行逻辑。

## test

`struct.c`中添加以下测例：

```c
// ASSERT(9, ({ struct {char a; int b;} x; sizeof(x); }));  // 去除这里
ASSERT(0, ({ struct {} x; sizeof(x); }));
ASSERT(16, ({ struct {char a; int b;} x; sizeof(x); }));
ASSERT(16, ({ struct {int a; char b;} x; sizeof(x); }));
```

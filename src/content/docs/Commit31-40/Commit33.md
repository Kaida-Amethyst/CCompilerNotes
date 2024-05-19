---
title: 33. Char Type
---

## commit log

```plaintext
Add char type
```

来引入新的类型：`char`。

但是，我们暂时不考虑内存的问题，尽管标准C中的char是1字节，我们也使用单字节寄存器去进行运算，但是在内存上还是占8字节。这里只是为了实现功能，性能优化我们放到后面。

## 思路

我们先前所有的变量都是int类型（其实并不是，因为8字节的原因，实际上是long类型），现在要来引入一个新类型，这个类型只有一字节。

对于词法分析，只需要添加对`char`的识别。

对于类型分析，也是添加对char的支持。

对于语法分析，主要是对类型的声明与定义语句。

对与代码生成，有一个问题是我们需要采用新的寄存器符号，因为我们原有的寄存器都是64位用全的，但是实际上x86支持我们只用其中的低位。

## 头文件

添加新类型：

```c
typedef enum {
  TY_CHAR,  // <---
  /*  other types */
} TypeKind;

extern Type *ty_char;
extern Type *ty_int;
```

## Lexer

主要是添加关键词：

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "return", "if", "else", "for", "while", "int", "sizeof", "char"
  }
}
```

## Type

`type.c`里面，添加对`char`的支持。

```c
Type *ty_char = &(Type){TY_CHAR, 1};
```

另外还有一点，我们的char也是属于integer类型的（function, pointer等不属于），因此还要修改`is_integer`函数：

```c
bool is_integer(Type *ty) {
  return ty->kind == TY_CHAR || ty->kind == TH_INT;
}
```

## Parser

因为添加了新的类型，我们首先想到的就是对声明语句的修改：

```c
static Type *declspec(Token **rest, Token *tok) {
  if (equal(tok, "char")) {
    *rest = tok->next;
    return ty_char;
  }
  *rest = skip(tok, "int");
  return ty_int;
}
```

我们不需要修改`declaration`函数，但是这个函数的`tok`指向的是一个类型，因此需要修改调用它的函数，就是`compound_stmt`函数。这个函数是默认当前的tok是一个int的，我们需要将其修改。

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  /*  other code  */
  while (!equal(tok, "}")) {
    if (is_typename(tok))
      cur = cur->next = declaration(&tok, tok);
    else 
      cur = cur->next = stmt(&tok, tok);
    add_type(cur);
  }
  /*  other code  */
}
```

当然我们需要实现这个`is_typename`。

```c
static bool is_typename (Token *tok) {
   return equal(tok, "char") || equal(tok, "int");
}
```

## codegen

首先，我们的寄存器现在都是8byte寄存器，现在我们要允许使用1byte寄存器。

```c
static char *argreg8[] =  {"%dil", "%sil", "%dl",  "cl",   "%r8b", "%r9b"};
static char *argreg64[] = {"%rdi", "%rsi", "%rdx", "%rcx", "%r8",  "%r9"};
```

接下来就是修改所有使用到原先的`argreg`的地方：

首先是store，此时的数据一定在寄存器`%rax`里面，但是我们只把它的低位放到`(%rdi)`里面。另外，原先的store无视类型，这一点需要修改。

```c
static void store(Type *ty) {
  pop("%rdi");
  if (ty->size == 1) {
    printf("  mov %%al, (%%rdi)\n");
  } else {
    printf("  mov %%rax, (%%rdi)");
  }
}
```

当然了，修改了store的定义，`gen_expr`中的`store`也需要做相应的修改。

```c
static void gen_expr(Node *node) {
  /*  other code  */
  store(node->ty);
  /*  other code */
  for (int nargs - 1; i >= 0; i--){
    pop(argreg64[i]);
  }
  
}
```

除掉store，自然还有load。但是注意，我们的char虽然运算的时候是使用单字节寄存器，但是在内存占用上，仍然是8字节，我们在移动数据的时候，要使用`movsbq`，这是一个符号扩展指令，将一个单字（b）有符号地拓展为一个八字（q）。

```c
static void load(Type * ty) {
  /*  other code  */
  if (ty->size == 1) {
    printf("  movsbq (%%rax), %%rax\n");
  } else {
    printf("  mov (%%rax), %%rax\n");
  }
}
```

最后还有一个问题是函数调用中的类型问题。

```c
static void emit_text(Obj *prog) {
  /*  other code  */
  for (Obj *var = fn->params; var; var = var->next) {
    if (var->ty->size == 1)
      printf("  mov %s, %d(%%rbp)\n", argreg8[i++], var->offset);
    else
      printf("  mov %s, %d(%%rbp)\n", argreg64[i++], var->offset);
  }
  /*  other code  */
}
```

## test.sh

添加以下测例：

```bash
assert 1 'int main() { char x=1; return x; }'
assert 1 'int main() { char x=1; char y=2; return x; }'
assert 2 'int main() { char x=1; char y=2; return y; }'

assert 1 'int main() { char x; return sizeof(x); }'
assert 10 'int main() { char x[10]; return sizeof(x); }'
assert 1 'int main() { return sub_char(7, 3, 3); } int sub_char(char a, char b, char c) { return a-b-c; }'
```

‍

---
title: 27. One Dimensional Arrays
---

## commit log

```plaintext
Add one dimensional arrays
```

添加一维数组。

## 思路

现在我们又有了一种数据类型，就是array。

## 头文件

```c
typedef enum {
  TY_INT,
  TY_PTR,
  TY_FUNC,
  TY_ARRAY,   // <----
} TypeKind;

struct Type {
  TypeKind kind;
  // typesize, size必须放在这里，方便初始化
  // 这个size也要用在后面sizeof关键字
  // 另外要注意与后面的array_len区分
  int size;

  // pointer to or array-of
  Type *base;

  Token* name;
  // use for array，array_len是一个数组有多少个元素
  // size是一个数组占多大的空间，这一点要记住。
  int array_len;

  Type *return_ty;
  Type *params;
  Type *next;
}

// 这里先添加上，具体代码一会儿在说
Type *array_of(Type *base, int size);
```

到了这里，我们其实可以解答一个问题，就是我们之前在判断一个变量是否是指针的时候，通常不是用`TypeKind==TY_PTR`，而是用这个`base != NULL`来判断。为什么要这么做？是因为我们的C标准是认为数组变量和指针变量是同一种东西。因此我们之后的很多场景下，会更多地使用base来判断，而不是TypeKind来判断。

## Type

首先修改`ty_int`这个全局变量，因为我们引入了`size`。

```c
Type *ty_int = &(Type){TY_INT, 8};
```

除掉`int`类型之外，指针类型的大小自然也是8，修改一下`pointer_to`：

```c
Type *pointer_to(Type *base) {
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_PTR;
  ty->size = 8;
  ty->base = base;
  return ty;
}
```

这里添加一个`array_of`函数，用于我们之后在parser阶段声明一个数组的时候用：

```c
Type *array_of(Type *base, int len) {
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_ARRAY;
  ty->size = base->size * len;
  ty->base = base;
  ty->array_len = len;
  return ty;
}
```

另外我们这里修改一下`add_type`。

```c
void add_type(Node *node) {
  /*  other code  */
  switch(node->kind) {
  /*  other cases  */
  case ND_NEG:
    node->ty = node->lhs->ty;
    return;
  case ND_ASSIGN:   // 我们暂时还不支持直接给array赋值。
    if (node->lhs->ty->kind == TY_ARRAY)
      error_tok(node->lhs->tok, "not an lvalue");
    node->ty = node->lhs->ty;
    return ;
  /*  other cases  */
  case ND_ADDR:
    if (node->lhs->ty->kind == TY_ARRAY)
      node->ty = pointer_to(node->lhs->ty->base);
    else 
      node->ty = pointer_to(node->lhs->ty);
    return ;
  case ND_DEREF:
    if (!node->lhs->ty->base)
      error_tok(node->tok, "invalid pointer dereference");
    node->ty = node->lhs->ty->base;
    return ;
}
```

这里要额外解释一下`case ND_ADDR`。

我们这里贴一段正常的C代码：

```c
int nums[10] = {0,1,2,3,4,5,6,7,8,9};

// Code A:
int *p = nums;
printf("p[5] = %d\n", p[5]);

// Code B:
int *p = &nums;  // <--- 这里多了一个&符号
printf("p[5] = %d\n", p[5]);
```

上面的两段代码都是可以编译通过的，且都会输出正确的值。只是下面的情况用gcc编译会报一个warning。

但是，这个warning虽然产生了，实际上C编译器是用了一个自动修正在里面的。也就是说，上面的`int *p = &nums`，其实C编译器是把它当成`int *p = nums`来看的。`&nums`的类型，其实是一个`int(*)[10]`，有一点像`int**`。

不过我们这里，对数组取地址，暂时我们得到的并非`int(*)[]`，而是就是一个`int*`。

## parser

注意到我们的`int func()`和`int nums[]`，其实有很大的相似性，我们修改一下`type_suffix`函数，让其可以处理两种情况。

```c
static Type *type_suffix(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "("))
    return func_params(rest, tok->next, ty);
  if (equal(tok "[")) {
    int sz = get_number(tok->next);
    *rest - skip(tok->next->next, "]");
    return array_of(ty, sz);
  }
  *rest = tok;
  return ty;
}
```

这里面我们调用了一个`get_number`，其实就是把`[]`里面作为token的数字给取出来。标准的C当然会支持稍稍复杂的情况，不过我们这里就暂时仅仅支持最简单的状况。

```c
static int get_number(Token *tok) {
  if (tok->kind != TK_NUM)
    error_tok(tok, "expected a number");
  return tok->val;
}
```

另外我们把原先的`type_suffix`中有关函数解析的部分也拿了出来放在一个`func_params`的函数里面：

```c
static Type *func_params(Token **rest, Token *tok, Type *ty) {                                      
  Type head = {};                                                                                   
  Type *cur = &head;                                                                                
                                                                                            
  while (!equal(tok, ")")) {                                                                        
    if (cur != &head)                                                                               
      tok = skip(tok, ",");                                                                         
    Type *basety = declspec(&tok, tok);                                                             
    Type *ty = declarator(&tok, tok, basety);                                                       
    cur = cur->next = copy_type(ty);                                                                
  }                                                                                                 
                                                                                                    
  ty = func_type(ty);                                                                               
  ty->params = head.next;                                                 
  *rest = tok->next;                                                                                
  return ty;                                                                                        
}  
```

除此之外，我们需要把`new_add`，`new_sub`改写一下，因为我们原先在指针索引里面，都是直接乘以8，现在要改成`base->size`。

```c
static Node *new_add(Node *lhs, Node *rhs, Token *tok) {
  /*  other code  */
  rhs = new_binary(ND_MUL, rhs, 
                   new_num(lhs->ty->base->size, tok), tok);
  return new_binary(ND_ADD, lhs, rhs, tok);
}

static Node *new_sub(Node *lhs, Node *rhs, Token *tok) {
  add_type(lhs);
  add_type(rhs);

  // num - num
  if (is_integer(lhs->ty) && is_integer(rhs->ty))
    return new_binary(ND_SUB, lhs, rhs, tok);

  // ptr - num
  if (lhs->ty->base && is_integer(rhs->ty)) {
    rhs = new_binary(ND_MUL, rhs,
                     new_num(lhs->ty->base->size, tok), tok);
    add_type(rhs);
    Node *node = new_binary(ND_SUB, lhs, rhs, tok);
    node->ty = lhs->ty;
    return node;
  }

  // ptr - ptr, which returns how many elements are between the two.
  if (lhs->ty->base && rhs->ty->base) {
    Node *node = new_binary(ND_SUB, lhs, rhs, tok);
    node->ty = ty_int;
    return new_binary(ND_DIV, node,
                      new_num(lhs->ty->base->size, tok), tok);
  }

  error_tok(tok, "invalid operands");
}

```

## codegen

首先我们把`assign_lvar_offsets`修改下，因为这里面我们分配内存都是直接加8，现在要做一个调整：

```c
offset += var->ty->size;
```

然后，对于`gen_expr`，这里有一个问题，原本我们是这么写的：

```c
static void gen_expr(Node *node) {
  switch(node->kind) {
  /*  other cases */
  case ND_VAR:
    gen_addr(node);
    printf("  mov (%%rax), %rax");
    return ;
  case ND_DEREF:
     gen_expr(node->lhs);
     printf("  mov (%%rax), %rax");
     return ;
  }
}
```

我们都是把变量的地址放到`rax`寄存器后，立马接一条指令把它的值给取出来。

这么做主要是因为只有变量的情况下，我们经常有`int y = x +1`这样的操作，会比较方便一点，但是如果变量是一个指针的情形下是不可以这么做的，因此需要做一个区分，我们写一个load函数。

```c
static void load(Type *ty) {
  // 如果是array，就什么也不做，其实这种应该也同样适用于指针，
  // 但在这个commit，我们仅仅让其适用于array
  if (ty->kind == TY_ARRAY) {
    return ;
  }
  printf("  mov (%%rax), %%rax\n");
}
```

相应地，我们也写一个store函数，对用到这个功能的地方做一下替换。

```c
static void store(void) {
  pop("%rdi");
  printf("  mov %%rax, (%%rdi)\n");
}
```

## test.sh

最后添加两个测例：

```bash
assert 3 'int main() { int x[2]; int *y=&x; *y=3; return *x; }'

assert 3 'int main() { int x[3]; *x=3; *(x+1)=4; *(x+2)=5; return *x; }'
assert 4 'int main() { int x[3]; *x=3; *(x+1)=4; *(x+2)=5; return *(x+1); }'
assert 5 'int main() { int x[3]; *x=3; *(x+1)=4; *(x+2)=5; return *(x+2); }'

```

‍

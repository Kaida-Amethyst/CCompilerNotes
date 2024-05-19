---
title: 32. Global Variables
---

## commit log

```plaintext
Add global variables
```

这一次就来填上一个commit的坑，添加全局变量。

## 思路

类型和词法上已经基本上不存在问题，主要是parser和codegen，因为我们还是假设一个C文件是一个又一个的function。这里我们要开始允许全局变量。

全局变量的注册在`.data`段内，使用时，利用`lea`指令，直接使用名称，而不是像局部变量那样查offset。

例如使用全局变量`x`，要这么做：`lea x(%rip), %%rax`。

## parser

我们把parse函数作如下的修改：

```c
Obj* parse(Token *tok) {
  globals = NULL;

  while (tok->kind != TK_EOF) {
    Type *basety = declspec(&tok, tok);

    // Function
    if (is_function(tok)) {
      tok = function(tok, basety);
      continue;
    }

    // Global variable
    tok = global_variable(tok, basety);
  }
  return globals;
}
```

这里面我们使用了`is_function`函数和`global_variable`函数，下面来实现一下。

注意这里面有个问题就是，我们的tok现在是指向了谁？指向的是类型后面的一个token，这个token未必就是变量名。譬如说我们可能有`int *x`，此时tok指向一个`*`，我们也可能有`int ****x(){}`，此时`tok`也指向一个`*`，换句话说，我们要往后看很多个token，才能确定我们到底把它解析成一个函数，还是解析成一个全局变量。那么这个`is_function`函数，就要向后扫描，只是为了确认它是一个函数还是全局变量。但是tok的位置还是不动。

```c
static bool is_function(Token *tok) {
  if (equal(tok, ";"))
    return false;

  Type dummy = {};
  Type *ty = declarator(&tok, tok, &dummy);
  return ty->kind = TY_FUNC;
}
```

上面的函数也高速我们，`declarator`函数的真正作用，其实是确认一个元素的类型。

然后我们来实现`global_variable`这个函数，它与局部变量的声明类似，存在`int x,y,z`这种形式，因此可以参考`declaration`这个函数。不过注意，我们暂时不考虑全局变量的运算问题，因为这个问题可能比较复杂。

```c
static Token *global_variable(Token *tok, Type *basety) {
  bool first = true;

  while(!consume(&tok, tok, ";")) {
    if (!first)
      tok = skip(tok, ",")
    first = false;

    Type *ty = declarator(&tok, tok, basety);
    new_gvar(get_ident(ty->name), ty);
  }
  return tok;
}
```

## codegen

我们原先的codegen，实际上只是指令生成，但是除掉指令之外，x86还允许我们在x86文件中定义全局变量。所以我们把原先的`codegen`函数给分成三个部分，第一部分为每个函数分配内存，第二部分生成全局变量代码，第三部分生成指令代码：

```c
void codegen(Obj *prog) {
  assign_lvar_offsets(prog);
  emit_data(prog);
  emit_text(prog);
}
```

`emit_text`就是原先`codegen`里面的内容，下面来实现一下`emit_data`。

```c
static void emit_data(Obj *prog) {
  for(Obj *var = prog; var; var = var->next) {
    if (var->is_function)
      continue;

    printf("  .data\n");
    printf("  .global %s\n", var->name);
    printf("%s:\n", var->name);
    printf("  .zero %d\n", var->ty->size);
  }
}
```

除此之外，还有就是是使用变量时的代码生成。修改`gen_addr`函数：

```c
static void gen_addr(Node *node) {
  switch (node->kind) {
    case ND_VAR:
      if (node->var->is_local) {
        printf("  lea %d(%%rbp), %%rax\n", node->var->offset);
      } else {
        printf("  lea %s(%%rip), %%rax\n", node->var->name);
      }
      return ;
    /*  other cases  */
  }
}
```

## test.sh

来添加以下测例：

```bash
assert 0 'int x; int main() { return x; }'
assert 3 'int x; int main() { x=3; return x; }'
assert 7 'int x; int y; int main() { x=3; y=4; return x+y; }'
assert 7 'int x, y; int main() { x=3; y=4; return x+y; }'
assert 0 'int x[4]; int main() { x[0]=0; x[1]=1; x[2]=2; x[3]=3; return x[0]; }'
assert 1 'int x[4]; int main() { x[0]=0; x[1]=1; x[2]=2; x[3]=3; return x[1]; }'
assert 2 'int x[4]; int main() { x[0]=0; x[1]=1; x[2]=2; x[3]=3; return x[2]; }'
assert 3 'int x[4]; int main() { x[0]=0; x[1]=1; x[2]=2; x[3]=3; return x[3]; }'

assert 8 'int x; int main() { return sizeof(x); }'
assert 32 'int x[4]; int main() { return sizeof(x); }'
```

‍
